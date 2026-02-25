import { createReducer } from '../../helpers/reducer';
import type { OutputType } from '../../output-devices';
import type { AudioQuality, VideoQuality } from '../../types';

export type StatisticsOutputType =
  | 'BLUETOOTH'
  | 'BUILT_IN'
  | 'DISPLAY_PORT'
  | 'HDMI'
  | 'SYSTEM_DEFAULT'
  | 'USB';

export type Stall = Readonly<{
  assetPosition: number;
  endTimestamp: number;
  reason: 'SEEK' | 'UNEXPECTED';
  startTimestamp: number;
}>;

export type Adaptation = Readonly<{
  assetPosition: number;
  bandwidth: number;
  codecs: string | null | undefined;
  mimeType: string | null | undefined;
  timestamp: number;
  videoHeight: number | null | undefined;
  videoWidth: number | null | undefined;
}>;

export type BasePayload = {
  actualAssetPresentation: 'FULL' | 'PREVIEW';
  actualAudioMode: 'DOLBY_ATMOS' | 'SONY_360RA' | 'STEREO';
  actualProductId: string | null;
  actualStartTimestamp: number;
  actualStreamType: 'LIVE' | 'ON_DEMAND';
  adaptations: Array<Adaptation>;
  cdm: 'FAIR_PLAY' | 'NONE' | 'WIDEVINE';
  cdmVersion: string | null;
  endReason: 'COMPLETE' | 'ERROR' | 'OTHER';
  endTimestamp: number;
  errorCode: string | null;
  errorMessage: string | null;
  hasAds: boolean;
  idealStartTimestamp: number;
  outputDevice: StatisticsOutputType | null;
  productType: 'TRACK' | 'VIDEO';
  stalls: Array<Stall>;
  streamingSessionId: string;
};

export type TrackPayload = {
  actualQuality: AudioQuality;
  productType: 'TRACK';
};

export type VideoPayload = {
  actualQuality: VideoQuality;
  productType: 'VIDEO';
};

export type Payload = BasePayload & (TrackPayload | VideoPayload);

export type PlaybackStatistics = {
  name: 'playback_statistics';
  payload: Payload;
};

export function transformOutputType(
  outputType: OutputType,
): StatisticsOutputType | undefined {
  switch (outputType) {
    case 'bluetooth':
      return 'BLUETOOTH';
    case 'builtIn':
      return 'BUILT_IN';
    case 'displayPort':
      return 'DISPLAY_PORT';
    case 'hdmi':
      return 'HDMI';
    case 'systemDefault':
      return 'SYSTEM_DEFAULT';
    case 'usb':
      return 'USB';
    // Never happens (cannot be chose by user)
    case 'airplay':
    case 'windowsCommunication':
    default:
      return undefined;
  }
}

const defaultPayload: Payload = {
  actualAssetPresentation: 'FULL',
  actualAudioMode: 'STEREO',
  actualProductId: null,
  actualQuality: 'LOSSLESS',
  actualStartTimestamp: 0,
  actualStreamType: 'ON_DEMAND',
  adaptations: [],
  cdm: 'WIDEVINE',
  cdmVersion: null,
  endReason: 'COMPLETE',
  endTimestamp: 0,
  errorCode: null,
  errorMessage: null,
  hasAds: false,
  idealStartTimestamp: 0,
  outputDevice: null,
  productType: 'TRACK',
  stalls: [],
  streamingSessionId: '',
};

const reducer = await createReducer<Payload, 'playback_statistics'>(
  'playback_statistics',
  defaultPayload,
);

/**
 * Create playbackStatistics event.
 */
export function playbackStatistics(newData: Parameters<typeof reducer>[0]) {
  return reducer(newData);
}
