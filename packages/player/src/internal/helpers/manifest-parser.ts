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
      case 'mp4a.40.2':
        return 'mp4a.40.2';
      case 'aac+':
        return 'aac+';
      case 'mp4a.40.5':
        return 'mp4a.40.5';
      case 'flac':
        return 'flac';
      case 'mqa':
        return 'mqa';
      case 'mp3':
        return 'mp3';
      default:
        break;
    }
  } else if (audioQuality) {
    switch (audioQuality) {
      case 'LOW':
        return 'mp4a.40.5';
      case 'HIGH':
        return 'mp4a.40.2';
      case 'LOSSLESS':
      case 'HI_RES':
      case 'HI_RES_LOSSLESS':
        return 'flac';
    }
  }

  return 'none';
}

export type StreamInfo = {
  albumPeakAmplitude?: number;
  albumReplayGain?: number;
  bitDepth?: number;
  codec?: Codec;
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
    | 'mqa'
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
    case 'mp3':
      return 'mp3';
    case 'aac':
    case 'aac+':
    case 'mp4a.40.2':
    case 'mp4a.40.5':
      return 'aac';
    case 'flac':
    case 'mqa':
      return streamFormat;
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

  if (codecs === 'mqa') {
    return codecs;
  }

  if (codecs === 'flac') {
    return codecs;
  }

  return undefined;
}

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
    playbackInfo.manifestMimeType === 'application/vnd.tidal.bts' ||
    playbackInfo.manifestMimeType === 'application/vnd.tidal.emu'
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
          ? playbackInfo.bitDepth ?? undefined // API sends null, cast to undefined
          : undefined,
      codec: streamFormatToCodec(streamFormat),
      prefetched,
      quality,
      sampleRate:
        'sampleRate' in playbackInfo
          ? playbackInfo.sampleRate ?? undefined // API sends null, cast to undefined
          : undefined,
      securityToken,
      streamFormat,
      streamUrl,
      streamingSessionId,
      ...mediaItem,
      expires: playbackInfo.expires,
    };
  }

  if (playbackInfo.manifestMimeType === 'application/dash+xml') {
    const streamUrl = `data:${playbackInfo.manifestMimeType};base64,${playbackInfo.manifest}`;
    const decodedManifest = atob(playbackInfo.manifest);

    return {
      ...replayGains,
      bitDepth:
        'bitDepth' in playbackInfo
          ? playbackInfo.bitDepth ?? undefined // API sends null, cast to undefined
          : undefined,
      codec: dashFindCodec(decodedManifest),
      prefetched,
      quality,
      sampleRate:
        'sampleRate' in playbackInfo
          ? playbackInfo.sampleRate ?? undefined // API sends null, cast to undefined
          : undefined,
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
