import type { MediaProduct } from '../../api/interfaces';
import * as Config from '../../config';
import type { ErrorCodes, ErrorIds } from '../../internal/index';
import { PlayerError } from '../../internal/index';
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

export type PlaybackInfo = BasePlaybackInfo &
  (PlaybackInfoTrack | PlaybackInfoVideo) &
  ExtraFields;

type Options = {
  accessToken: string | undefined;
  audioQuality: AudioQuality;
  clientId: null | string;
  mediaProduct: MediaProduct;
  prefetch: boolean;
  streamingSessionId: string;
};

type PlaybackInfoErrorResponse = {
  status: number;
  subStatus: number;
  userMessage: string;
};

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
    throw new Error('Retries exchaused. Cannot fetch playbackinfo.');
  }

  return res;
};

function getErrorId(status: number, subStatus: number): ErrorIds {
  switch (subStatus) {
    case 4032:
    case 4035:
      return 'PEContentNotAvailableInLocation';
    case 4033:
      return 'PEContentNotAvailableForSubscription';
    case 4010:
      return 'PEMonthlyStreamQuotaExceeded';
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

async function _fetch(options: Options): Promise<PlaybackInfo> {
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
  } catch (e) {
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
    prefetched: prefetch,
  };
}

export async function fetchPlaybackInfo(options: Options) {
  const { streamingSessionId } = options;
  const events = [];

  performance.mark('streaming_metrics:playback_info_fetch:startTimestamp', {
    detail: streamingSessionId,
    startTime: trueTime.now(),
  });

  try {
    const playbackInfo = await _fetch(options);

    if (playbackInfo === undefined) {
      throw new Error('Playback info was fetched, but undefined.');
    }

    StreamingMetrics.playbackInfoFetch({
      endReason: 'COMPLETE',
      streamingSessionId,
    }).catch(console.error);

    // eslint-disable-next-line no-restricted-syntax
    playbackInfo.expires = Date.now() + 3600000; // An hour after fetch

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

    StreamingMetrics.commit({
      events,
    }).catch(console.error);

    performance.clearMarks(
      'streaming_metrics:playback_info_fetch:endTimestamp',
    );
    performance.clearMarks(
      'streaming_metrics:playback_info_fetch:startTimestamp',
    );
  }
}
