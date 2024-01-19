import { createReducer } from '../../helpers/reducer';
import type { OutputType } from '../../output-devices';
import type { AudioQuality, VideoQuality } from '../../types';

export type StatisticsOutputType =
  | 'BLUETOOTH'
  | 'BUILT_IN'
  | 'DISPLAY_PORT'
  | 'HDMI'
  | 'MQA'
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
  codecs: null | string | undefined;
  mimeType: null | string | undefined;
  timestamp: number;
  videoHeight: null | number | undefined;
  videoWidth: null | number | undefined;
}>;

export type BasePayload = {
  actualAssetPresentation: 'FULL' | 'PREVIEW';
  actualAudioMode: 'DOLBY_ATMOS' | 'SONY_360RA' | 'STEREO';
  actualProductId: null | string;
  actualStartTimestamp: number;
  actualStreamType: 'LIVE' | 'ON_DEMAND';
  adaptations: Array<Adaptation>;
  cdm: 'FAIR_PLAY' | 'NONE' | 'PLAY_READY' | 'WIDEVINE';
  cdmVersion: null | string;
  endReason: 'COMPLETE' | 'ERROR' | 'OTHER';
  endTimestamp: number;
  errorCode: null | string;
  errorMessage: null | string;
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
    case 'displayPort':
      return 'DISPLAY_PORT';
    case 'mqa':
      return 'MQA';
    case 'builtIn':
      return 'BUILT_IN';
    case 'hdmi':
      return 'HDMI';
    case 'usb':
      return 'USB';
    case 'systemDefault':
      return 'SYSTEM_DEFAULT';
    // Never happens (cannot be chose by user)
    case 'windowsCommunication':
    case 'airplay':
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
