import { mimeTypes } from '../../internal/constants';
import type { NativePlayerStreamFormat } from '../../player/nativeInterface';
import type { AudioQuality, Codec, VideoQuality } from '../types';

import type { PlaybackInfo } from './playback-info-resolver';

type EmuManifest = Readonly<{
  mimeType: string;
  urls: ReadonlyArray<string>;
}>;

type BtsManifest = Readonly<{
  codecs: string;
  encryptionType: string;
  keyId?: string;
  licenseSecurityToken?: string;
  mimeType: string;
  urls: ReadonlyArray<string>;
}>;

function parseJSONManifest(manifestAsBase64: string) {
  return JSON.parse(atob(manifestAsBase64)) as BtsManifest | EmuManifest;
}

function extractStreamFormat(
  manifest: BtsManifest | EmuManifest,
  audioQuality: AudioQuality | null,
): NativePlayerStreamFormat {
  if ('codecs' in manifest) {
    switch (manifest.codecs) {
      case 'aac':
        return 'aac';
      case 'aac+':
        return 'aac+';
      case 'flac':
        return 'flac';
      case 'mp3':
        return 'mp3';
      case 'mp4a.40.2':
        return 'mp4a.40.2';
      case 'mp4a.40.5':
        return 'mp4a.40.5';
      default:
        break;
    }
  } else if (audioQuality) {
    switch (audioQuality) {
      case 'HI_RES':
      case 'HI_RES_LOSSLESS':
      case 'LOSSLESS':
        return 'flac';
      case 'HIGH':
        return 'mp4a.40.2';
      case 'LOW':
        return 'mp4a.40.5';
    }
  }

  return 'none';
}

export type StreamInfo = {
  albumPeakAmplitude?: number;
  albumReplayGain?: number;
  bitDepth?: number;
  codec?: Codec;
  duration?: number;
  expires: number;
  id: string;
  prefetched: boolean;
  quality: AudioQuality | VideoQuality;
  sampleRate?: number;
  securityToken?: string;
  streamFormat?:
    | 'aac'
    | 'aac+'
    | 'flac'
    | 'mp3'
    | 'mp4a.40.2'
    | 'mp4a.40.5'
    | 'none';
  streamUrl: string;
  streamingSessionId: string;
  trackPeakAmplitude?: number;
  trackReplayGain?: number;
  type: 'track' | 'video';
};

function streamFormatToCodec(
  streamFormat: NativePlayerStreamFormat,
): Codec | undefined {
  switch (streamFormat) {
    case 'aac':
    case 'aac+':
    case 'mp4a.40.2':
    case 'mp4a.40.5':
      return 'aac';
    case 'flac':
      return streamFormat;
    case 'mp3':
      return 'mp3';
    default:
      return undefined;
  }
}

function dashFindCodec(manifest: string): Codec | undefined {
  // Dash manifest
  const search = /codecs=(["'])?((?:.(?!\1|>))*.?)\1?/.exec(manifest);

  if (search === null) {
    return undefined;
  }

  const codecs = search[2] ?? '';

  if (codecs.includes('mp4a') || codecs.includes('aac')) {
    return 'aac';
  }

  if (codecs === 'flac') {
    return codecs;
  }

  return undefined;
}

/**
 * Convert duration format to seconds.
 * (PT2M26.47S -> seconds)
 */
function parseDuration(duration: string): number {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/;
  const match = regex.exec(duration);

  if (!match) {
    throw new Error('Invalid duration format');
  }

  const hours = parseFloat(match[1] || '0'); // hours part, if present
  const minutes = parseFloat(match[2] || '0'); // minutes part, if present
  const seconds = parseFloat(match[3] || '0'); // seconds part, if present

  // Convert the duration to total seconds
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Find duration in a DASH manifest
 */
function dashFindDuration(manifest: string): number | undefined {
  // Dash manifest
  const regex = /mediaPresentationDuration="([^"]+)"/;
  const match = regex.exec(manifest);

  if (match) {
    const duration = match[1];

    if (duration) {
      return parseDuration(duration);
    }
  }

  return undefined;
}

/**
 * Find sample rate in a DASH manifest
 */
function dashFindSampleRate(manifest: string): number | undefined {
  // Dash manifest
  const regex = /<Representation[^>]*audioSamplingRate="(\d+)"/;
  const match = regex.exec(manifest);

  if (match) {
    const rate = match[1];
    if (rate) {
      return Number(rate);
    }
  }

  return undefined;
}

/**
 * Find sample rate in a TIDAL HLS manifest
 */
function hlsFindSampleRate(manifest: string): number | undefined {
  // Look for X-COM-TIDAL-SAMPLE-RATE in EXT-X-DATERANGE or similar tags
  const regex = /X-COM-TIDAL-SAMPLE-RATE=(\d+)/;
  const match = regex.exec(manifest);
  if (match) {
    return Number(match[1]);
  }
  return undefined;
}

/**
 * Find bit depth in a TIDAL HLS manifest
 */
function hlsFindBitDepth(manifest: string): number | undefined {
  // Look for X-COM-TIDAL-SAMPLE-DEPTH in EXT-X-DATERANGE or similar tags
  const regex = /X-COM-TIDAL-SAMPLE-DEPTH=(\d+)/;
  const match = regex.exec(manifest);
  if (match) {
    return Number(match[1]);
  }
  return undefined;
}

/**
 * Find codec in a TIDAL HLS manifest
 */
function hlsFindCodec(manifest: string): string | undefined {
  // Look for CODECS in EXT-X-STREAM-INF
  const regex = /#EXT-X-STREAM-INF:[^\n]*CODECS="([^"]+)"/;
  const match = regex.exec(manifest);
  if (match) {
    return match[1];
  }
  return undefined;
}

/**
 * Find duration in a TIDAL HLS manifest (sum of all EXTINF durations)
 */
function hlsFindDuration(manifest: string): number | undefined {
  // Sum all #EXTINF: durations
  const regex = /#EXTINF:([\d.]+),/g;
  let match;
  let total = 0;
  let found = false;
  while ((match = regex.exec(manifest)) !== null) {
    total += parseFloat(match[1]!);
    found = true;
  }
  return found ? total : undefined;
}

/**
 * Find bit depth in a DASH manifest (from id attribute of Representation, e.g. id="FLAC,44100,16")
 */
function dashFindBitDepth(manifest: string): number | undefined {
  const repMatch = /<Representation[^>]*id="([^"]+)"/.exec(manifest);
  if (repMatch) {
    const id = repMatch[1];
    const numbers = id?.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      return Number(numbers[numbers.length - 1]);
    }
  }
  return undefined;
}

/**
 * Parses playback info manifest into a stream info object.
 *
 * @param playbackInfo - The playback information containing the manifest.
 * @returns The parsed stream information.
 */
export function parseManifest(playbackInfo: PlaybackInfo): StreamInfo {
  const { prefetched, streamingSessionId } = playbackInfo;

  const replayGains =
    'albumReplayGain' in playbackInfo
      ? {
          albumPeakAmplitude: playbackInfo.albumPeakAmplitude,
          albumReplayGain: playbackInfo.albumReplayGain,
          trackPeakAmplitude: playbackInfo.trackPeakAmplitude,
          trackReplayGain: playbackInfo.trackReplayGain,
        }
      : {};

  const quality =
    'audioQuality' in playbackInfo
      ? playbackInfo.audioQuality
      : playbackInfo.videoQuality;

  const mediaItem: { id: string; type: 'track' | 'video' } = {
    id: String(
      'videoId' in playbackInfo ? playbackInfo.videoId : playbackInfo.trackId,
    ),
    type: 'trackId' in playbackInfo ? 'track' : 'video',
  };

  if (
    playbackInfo.manifestMimeType === mimeTypes.BTS ||
    playbackInfo.manifestMimeType === mimeTypes.EMU
  ) {
    const parsedManifest = parseJSONManifest(playbackInfo.manifest);
    const streamUrl = parsedManifest.urls[0]!;
    const streamFormat = extractStreamFormat(
      parsedManifest,
      'audioQuality' in playbackInfo ? playbackInfo.audioQuality : null,
    );

    let securityToken: string | undefined;

    if ('keyId' in parsedManifest) {
      securityToken = parsedManifest.keyId;
    }

    if ('licenseSecurityToken' in playbackInfo) {
      securityToken = playbackInfo.licenseSecurityToken;
    }

    return {
      ...replayGains,
      bitDepth:
        'bitDepth' in playbackInfo
          ? (playbackInfo.bitDepth ?? undefined) // API sends null, cast to undefined
          : undefined,
      codec: streamFormatToCodec(streamFormat),
      prefetched,
      quality,
      sampleRate:
        'sampleRate' in playbackInfo
          ? (playbackInfo.sampleRate ?? undefined) // API sends null, cast to undefined
          : undefined,
      securityToken,
      streamFormat,
      streamUrl,
      streamingSessionId,
      ...mediaItem,
      expires: playbackInfo.expires,
    };
  }

  if (playbackInfo.manifestMimeType === mimeTypes.DASH) {
    const streamUrl = `data:${playbackInfo.manifestMimeType};base64,${playbackInfo.manifest}`;
    const decodedManifest = atob(playbackInfo.manifest);

    return {
      ...replayGains,
      bitDepth: dashFindBitDepth(decodedManifest),
      codec: dashFindCodec(decodedManifest),
      duration: dashFindDuration(decodedManifest),
      prefetched,
      quality,
      sampleRate: dashFindSampleRate(decodedManifest),
      securityToken: playbackInfo.licenseSecurityToken,
      streamUrl,
      streamingSessionId,
      ...mediaItem,
      expires: playbackInfo.expires,
    };
  }

  if (playbackInfo.manifestMimeType === mimeTypes.HLS) {
    const streamUrl = `data:${playbackInfo.manifestMimeType};base64,${playbackInfo.manifest}`;

    const decodedManifest = atob(playbackInfo.manifest);
    const firstVariantManifest = atob(
      decodedManifest.split('base64,')[1]!.split('\n')[0]!,
    );

    return {
      ...replayGains,
      bitDepth: hlsFindBitDepth(firstVariantManifest),
      codec: streamFormatToCodec(
        hlsFindCodec(
          decodedManifest,
        )?.toLowerCase() as NativePlayerStreamFormat,
      ),
      duration: hlsFindDuration(firstVariantManifest),
      prefetched,
      quality,
      sampleRate: hlsFindSampleRate(firstVariantManifest),
      securityToken: playbackInfo.licenseSecurityToken,
      streamUrl,
      streamingSessionId,
      ...mediaItem,
      expires: playbackInfo.expires,
    };
  }

  throw new TypeError(
    `${playbackInfo.manifestMimeType} not supported as playback info manifest mime type.`,
  );
}
