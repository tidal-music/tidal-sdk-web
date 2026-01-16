import { type components, createAPIClient } from '@tidal-music/api';
import shaka from 'shaka-player';

import type { MediaProduct } from '../../api/interfaces';
import * as Config from '../../config';
import type { ErrorCodes, ErrorIds } from '../../internal/index';
import { PlayerError, credentialsProviderStore } from '../../internal/index';
import type { AudioQuality } from '../../internal/types';
import * as StreamingMetrics from '../event-tracking/streaming-metrics';
import { waitFor } from '../helpers/wait-for';
import { trueTime } from '../true-time';

type VideoQuality = 'AUDIO_ONLY' | 'HIGH' | 'LOW' | 'MEDIUM';

type AudioMode = 'DOLBY_ATMOS' | 'SONY_360RA' | 'STEREO';
type AssetPresentation = 'FULL' | 'PREVIEW';
type SteamType = 'LIVE' | 'ON_DEMAND';

type BasePlaybackInfo = {
  assetPresentation: AssetPresentation;
  licenseSecurityToken?: string;
  manifest: string;
  manifestHash?: string;
  manifestMimeType: string;
  prefetched: boolean;
  streamingSessionId: string;
};

export type PlaybackInfoTrack = BasePlaybackInfo & {
  albumPeakAmplitude: number;
  albumReplayGain: number;
  audioMode: AudioMode;
  audioQuality: AudioQuality;
  bitDepth: null | number; // API sends null
  sampleRate: null | number; // API sends null
  trackId: number;
  trackPeakAmplitude: number;
  trackReplayGain: number;
};

export type PlaybackInfoVideo = BasePlaybackInfo & {
  streamType: SteamType;
  videoId: number;
  videoQuality: VideoQuality;
};

type ExtraFields = {
  expires: number;
};

export type PlaybackInfo = ExtraFields &
  (PlaybackInfoTrack | PlaybackInfoVideo);

export type Options = {
  accessToken: string | undefined;
  audioQuality: AudioQuality;
  clientId: null | string;
  mediaProduct: MediaProduct;
  playerType?: 'browser' | 'native' | 'shaka';
  prefetch: boolean;
  streamingSessionId: string;
};

type PlaybackInfoErrorResponse = {
  status: number;
  subStatus: number;
  userMessage: string;
};

const MANIFEST_EXPIRATION_MS = 3600000; // 1 hour

const fetchWithRetries = async (
  url: string,
  options = {},
  retries = 3,
): Promise<Response> => {
  const MAX_RETRY_COUNT = 4;
  let res: Response | undefined;
  let status: null | number | undefined;

  try {
    res = await fetch(url, options);
  } catch (e) {
    if (retries === 0) {
      throw e;
    } else {
      status = null;
    }
  }

  if (res?.ok) {
    return res;
  }

  const status500Range = res && res.status >= 500 && res.status <= 599;
  const statusRetryAllowed =
    status === null || status500Range || res?.status === 429;

  if (retries > 0 && statusRetryAllowed) {
    const ms = 500 * Math.abs(MAX_RETRY_COUNT - retries);

    console.debug(
      `Retrying request for ${Math.abs(
        MAX_RETRY_COUNT - retries,
      )}th time in ${ms}ms`,
    );

    await waitFor(ms);

    return fetchWithRetries(url, options, retries - 1);
  }

  if (!res) {
    throw new Error('Retries exhausted. Cannot fetch playbackinfo.');
  }

  return res;
};

function getErrorId(status: number, subStatus: number): ErrorIds {
  switch (subStatus) {
    case 4010:
      return 'PEMonthlyStreamQuotaExceeded';
    case 4032:
    case 4035:
      return 'PEContentNotAvailableInLocation';
    case 4033:
      return 'PEContentNotAvailableForSubscription';
    default:
      break;
  }

  if ((status >= 500 && status < 600) || status === 429) {
    return 'PERetryable';
  }

  if (status >= 400 && status < 500) {
    return 'PENotAllowed';
  }

  return 'EUnexpected';
}

// type def with "& URLSearchParams" is not the same as "interface extends".
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface URLSearchParamsCustomSetters<T extends string>
  extends URLSearchParams {
  set: (name: T, value: string) => void;
}

// type def with "& URLSearchParams" is not the same as "interface extends".
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface HeadersCustomSetters<T extends string> extends Headers {
  set: (name: T, value: string) => void;
}

async function _fetchLegacyPlaybackInfo(
  options: Options,
): Promise<PlaybackInfo> {
  const {
    accessToken,
    audioQuality,
    clientId,
    mediaProduct,
    prefetch,
    streamingSessionId,
  } = options;

  const apiUrl = Config.get('apiUrl');
  const url = new URL(
    `${apiUrl}/${mediaProduct.productType}s/${mediaProduct.productId}/playbackinfo`,
  );
  const searchParams = url.searchParams as URLSearchParamsCustomSetters<
    'assetpresentation' | 'audioquality' | 'playbackmode' | 'videoquality'
  >;

  if (mediaProduct.productType === 'video') {
    searchParams.set('videoquality', 'HIGH');
  } else {
    searchParams.set('audioquality', audioQuality);
  }

  searchParams.set('playbackmode', 'STREAM');

  searchParams.set('assetpresentation', 'FULL');

  const headers = new Headers() as HeadersCustomSetters<
    | 'authorization'
    | 'x-tidal-playlistuuid'
    | 'x-tidal-prefetch'
    | 'x-tidal-streamingsessionid'
    | 'x-tidal-token'
  >;

  if (prefetch) {
    headers.set('x-tidal-prefetch', 'true');
  }

  if (clientId) {
    headers.set('x-tidal-token', clientId);
  }

  if (accessToken) {
    headers.set('authorization', 'Bearer ' + accessToken);
  }

  if (streamingSessionId) {
    headers.set('x-tidal-streamingsessionid', streamingSessionId);
  }

  let response: Response;

  try {
    response = await fetchWithRetries(
      url.toString(),
      {
        headers,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - It is a thing.
        importance: 'high',
      },
      3,
    );
  } catch {
    throw new PlayerError('PENetwork', 'NPBI0');
  }

  const json = (await response.json()) as
    | PlaybackInfo
    | PlaybackInfoErrorResponse;

  if ('status' in json) {
    const errorCode = `A${json.subStatus}` as ErrorCodes;

    throw new PlayerError(getErrorId(json.status, json.subStatus), errorCode);
  }

  const validPlaybackInfoForTrack = 'trackId' in json;
  const validPlaybackInfoForVideo = 'videoId' in json;

  if (!validPlaybackInfoForTrack && !validPlaybackInfoForVideo) {
    throw new PlayerError('EUnexpected', 'B9999');
  }

  return {
    ...json,
    // eslint-disable-next-line no-restricted-syntax
    expires: Date.now() + MANIFEST_EXPIRATION_MS,
    prefetched: prefetch,
  };
}

function audioFormatsToQuality(
  formats: components['schemas']['TrackManifests_Attributes']['formats'],
): AudioQuality {
  if (!Array.isArray(formats)) {
    throw new Error('Invalid formats array');
  }

  if (formats.length === 0) {
    throw new Error('Empty formats array');
  }

  if (formats.includes('FLAC_HIRES')) {
    return 'HI_RES_LOSSLESS';
  } else if (formats.includes('FLAC')) {
    return 'LOSSLESS';
  } else if (formats.includes('AACLC')) {
    return 'HIGH';
  } /* if (formats.includes('HEAACV1')) */ else {
    return 'LOW';
  }
}

function audioQualityToFormats(
  quality: AudioQuality,
): NonNullable<components['schemas']['TrackManifests_Attributes']['formats']> {
  switch (quality) {
    case 'HI_RES':
    case 'HI_RES_LOSSLESS':
      return ['HEAACV1', 'AACLC', 'FLAC', 'FLAC_HIRES'];
    case 'HIGH':
      return ['HEAACV1', 'AACLC'];
    case 'LOSSLESS':
      return ['HEAACV1', 'AACLC', 'FLAC'];
    case 'LOW':
    default:
      return ['HEAACV1'];
  }
}

function parseDataUrl(dataUrl: string | undefined):
  | {
      manifest: string;
      manifestMimeType: string;
    }
  | undefined {
  if (!dataUrl) {
    return;
  }
  const regex = /data:([^;]+);base64,(.+)/;
  const matches = regex.exec(dataUrl);

  if (!matches || matches.length < 3) {
    return;
  }

  const manifestMimeType = matches[1]?.trim();
  const manifest = matches[2]?.trim();

  if (!manifestMimeType || !manifest) {
    return;
  }

  return {
    manifest,
    manifestMimeType,
  };
}

/**
 * Fetches the track manifest for a given media product using the API client.
 */
// eslint-disable-next-line complexity
async function _fetchTrackManifest(options: Options): Promise<PlaybackInfo> {
  // TODO: consider saving the API client for reuse
  const apiClient = createAPIClient(
    credentialsProviderStore.credentialsProvider,
  );

  const { audioQuality, mediaProduct, prefetch, streamingSessionId } = options;
  const trackId = mediaProduct.productId;

  const isFairPlaySupported =
    await shaka.util.FairPlayUtils.isFairPlaySupported();

  const response = await apiClient.GET('/trackManifests/{id}', {
    params: {
      headers: {
        'x-playback-session-id': streamingSessionId,
      },
      path: {
        id: trackId,
      },
      query: {
        adaptive: false,
        formats: audioQualityToFormats(audioQuality),
        manifestType: isFairPlaySupported ? 'HLS' : 'MPEG_DASH',
        uriScheme: 'DATA',
        usage: 'PLAYBACK',
      },
    },
  });

  if (response.error) {
    throw new PlayerError('PENetwork', 'NPBI0');
  }

  const parsed = parseDataUrl(response.data?.data.attributes?.uri);

  const manifest = parsed?.manifest;
  const manifestMimeType = parsed?.manifestMimeType;

  if (!manifest || !manifestMimeType) {
    throw new PlayerError('EUnexpected', 'B9999');
  }

  return {
    albumPeakAmplitude:
      response.data?.data.attributes?.albumAudioNormalizationData
        ?.peakAmplitude ?? 0,
    albumReplayGain:
      response.data?.data.attributes?.albumAudioNormalizationData?.replayGain ??
      0,
    assetPresentation:
      response.data?.data.attributes?.trackPresentation ?? 'PREVIEW',
    audioMode: 'STEREO',
    audioQuality: audioFormatsToQuality(
      response.data?.data.attributes?.formats,
    ),
    bitDepth: 0,
    // eslint-disable-next-line no-restricted-syntax
    expires: Date.now() + MANIFEST_EXPIRATION_MS,
    manifest,
    manifestHash: response.data?.data.attributes?.hash,
    manifestMimeType,
    prefetched: prefetch,
    sampleRate: 0,
    streamingSessionId,
    trackId: response.data?.data.id ? Number(response.data.data.id) : 0,
    trackPeakAmplitude:
      response.data?.data.attributes?.trackAudioNormalizationData
        ?.peakAmplitude ?? 0,
    trackReplayGain:
      response.data?.data.attributes?.trackAudioNormalizationData?.replayGain ??
      0,
  };
}

/**
 * Fetches playback information for a media product.
 *
 * @param options - The options for fetching playback info including media product, audio quality, and streaming session ID.
 * @returns A promise that resolves to the playback information.
 */
export async function fetchPlaybackInfo(options: Options) {
  const { streamingSessionId } = options;
  const events = [];

  performance.mark('streaming_metrics:playback_info_fetch:startTimestamp', {
    detail: streamingSessionId,
    startTime: trueTime.now(),
  });

  try {
    let playbackInfo: PlaybackInfo;

    if (
      options.mediaProduct.productType === 'video' ||
      options.playerType === 'native'
    ) {
      // Use old API for videos and Native Player track playback
      playbackInfo = await _fetchLegacyPlaybackInfo(options);
    } else {
      playbackInfo = await _fetchTrackManifest(options);
    }

    if (playbackInfo === undefined) {
      throw new Error('Playback info was fetched, but undefined.');
    }

    StreamingMetrics.playbackInfoFetch({
      endReason: 'COMPLETE',
      streamingSessionId,
    }).catch(console.error);

    const hasAds = 'adInfo' in playbackInfo;

    if ('trackId' in playbackInfo) {
      StreamingMetrics.playbackStatistics({
        actualAssetPresentation: playbackInfo.assetPresentation,
        actualAudioMode: playbackInfo.audioMode,
        actualProductId: String(playbackInfo.trackId),
        actualQuality: playbackInfo.audioQuality,
        actualStreamType: undefined,
        hasAds,
        productType: 'TRACK',
        streamingSessionId,
      }).catch(console.error);
    } else {
      StreamingMetrics.playbackStatistics({
        actualAssetPresentation: playbackInfo.assetPresentation,
        actualAudioMode: undefined,
        actualProductId: String(playbackInfo.videoId),
        actualQuality: playbackInfo.videoQuality,
        actualStreamType: playbackInfo.streamType,
        hasAds,
        productType: 'VIDEO',
        streamingSessionId,
      }).catch(console.error);
    }

    performance.mark('streaming_metrics:playback_info_fetch:endTimestamp', {
      detail: streamingSessionId,
      startTime: trueTime.now(),
    });

    return playbackInfo;
  } catch (e) {
    performance.mark('streaming_metrics:playback_info_fetch:endTimestamp', {
      detail: streamingSessionId,
      startTime: trueTime.now(),
    });

    StreamingMetrics.playbackInfoFetch({
      endReason: 'ERROR',
      errorCode: (e as Error | PlayerError).message,
      errorMessage: (e as Error | PlayerError).stack,
      streamingSessionId,
    }).catch(console.error);

    events.push(
      StreamingMetrics.streamingSessionEnd({
        streamingSessionId,
        timestamp: trueTime.timestamp(
          'streaming_metrics:playback_info_fetch:endTimestamp',
        ),
      }),
    );

    // Continue throwing to the loadHandler and nextHandler.
    throw e;
  } finally {
    events.push(
      StreamingMetrics.playbackInfoFetch({
        endTimestamp: trueTime.timestamp(
          'streaming_metrics:playback_info_fetch:endTimestamp',
        ),
        startTimestamp: trueTime.timestamp(
          'streaming_metrics:playback_info_fetch:startTimestamp',
        ),
        streamingSessionId,
      }),
    );

    StreamingMetrics.commit(events).catch(console.error);

    performance.clearMarks(
      'streaming_metrics:playback_info_fetch:endTimestamp',
    );
    performance.clearMarks(
      'streaming_metrics:playback_info_fetch:startTimestamp',
    );
  }
}
