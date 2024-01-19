import Bowser from 'bowser';

import { createReducer } from '../../helpers/reducer';

const platform = Bowser.parse(navigator.userAgent);

export type Payload = {
  abTestGroup: null | string;
  abTestName: null | string;
  browser: null | string;
  browserVersion: null | string;
  hardwarePlatform: 'DESKTOP' | 'WEB';
  isOfflineModeStart: boolean;
  mobileNetworkType: '3G' | '4G' | 'HSPA' | null;
  networkType: 'ETHERNET' | 'MOBILE' | 'NONE' | 'OTHER' | 'WIFI';
  operatingSystem: null | string;
  operatingSystemVersion: null | string;
  screenHeight: number;
  screenWidth: number;
  sessionProductId: string;
  sessionProductType: 'BROADCAST' | 'TRACK' | 'VIDEO';
  sessionTags: Array<string>;
  sessionType: 'DOWNLOAD' | 'PLAYBACK';
  startReason: 'EXPLICIT' | 'IMPLICIT';
  streamingSessionId: string;
  timestamp: number;
};

export type StreamingSessionStart = {
  name: 'streaming_session_start';
  payload: Payload;
};

const defaultPayload: Payload = {
  abTestGroup: null,
  abTestName: null,
  browser: platform.browser.name ?? null,
  browserVersion: platform.browser.version ?? null,
  hardwarePlatform: platform.browser.name === 'Electron' ? 'DESKTOP' : 'WEB',
  isOfflineModeStart: false,
  mobileNetworkType: null,
  networkType: 'WIFI',
  operatingSystem: platform.os.name ?? null,
  operatingSystemVersion: platform.os.version ?? null,
  screenHeight: window.screen.height,
  screenWidth: window.screen.width,
  sessionProductId: '',
  sessionProductType: 'TRACK',
  sessionTags: [],
  sessionType: 'PLAYBACK',
  startReason: 'IMPLICIT',
  streamingSessionId: '',
  timestamp: 0,
};

const reducer = await createReducer<Payload, 'streaming_session_start'>(
  'streaming_session_start',
  defaultPayload,
);

/**
 * The streaming session start event is sent by
 * clients once a new streaming session initiates
 * (see definition above). It represents the start
 * of a streaming session and includes information
 * regarding the client environment.
 *
 * A new streaming session starts whenever a client
 * decides that a media asset should be played.
 */
export function streamingSessionStart(newData: Parameters<typeof reducer>[0]) {
  return reducer(newData);
}
