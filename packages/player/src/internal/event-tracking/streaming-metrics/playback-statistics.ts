import { createReducer, type Reducer } from '../../helpers/reducer';
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

export type VideoPayload = BasePayload & {
  actualQuality: VideoQuality;
  productType: 'VIDEO';
};

export type TrackPayload = BasePayload & {
  actualQuality: AudioQuality;
  productType: 'TRACK';
};

export type PlaybackStatistics = {
  name: 'playback_statistics';
  payload: TrackPayload | VideoPayload;
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

const defaultTrackPayload: TrackPayload = {
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

const defaultVideoPayload: VideoPayload = {
  actualAssetPresentation: 'FULL',
  actualAudioMode: 'STEREO',
  actualProductId: null,
  actualQuality: 'HIGH',
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
  productType: 'VIDEO',
  stalls: [],
  streamingSessionId: '',
};

const reducer: Reducer<TrackPayload, "playback_statistics"> = await createReducer(
  'playback_statistics',
  defaultTrackPayload,
);

/**
 * Create playbackStatistics event.
 */
export function playbackStatistics(newData: Parameters<typeof reducer>[0]): Promise<{
  payload: TrackPayload | VideoPayload;
  name: "playback_statistics";
  streamingSessionId: string;
} | undefined> {
  return reducer(newData);
}

const trackPayloadReducer: Reducer<TrackPayload, "playback_statistics"> = await createReducer(
  'playback_statistics',
  defaultTrackPayload,
);

/**
 * Create playbackStatistics event.
 */
export function playbackStatisticsTrack(newData: Parameters<typeof trackPayloadReducer>[0]): Promise<{
  payload: TrackPayload;
  name: "playback_statistics";
  streamingSessionId: string;
} | undefined> {
  return trackPayloadReducer(newData);
}

const videoPayloadReducer: Reducer<VideoPayload, "playback_statistics"> = await createReducer(
  'playback_statistics',
  defaultVideoPayload,
);

export function playbackStatisticsVideo(newData: Parameters<typeof videoPayloadReducer>[0]): Promise<{
  payload: VideoPayload;
  name: "playback_statistics";
  streamingSessionId: string;
} | undefined> {
  return videoPayloadReducer(newData);
}
