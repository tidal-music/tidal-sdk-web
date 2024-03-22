import type { PlaybackSession } from './play-log/playback-session';
import type { Progress } from './playback/progress';
import type { DrmLicenseFetch } from './streaming-metrics/drm-license-fetch';
import type { PlaybackInfoFetch } from './streaming-metrics/playback-info-fetch';
import type { PlaybackStatistics } from './streaming-metrics/playback-statistics';
import type { StreamingSessionEnd } from './streaming-metrics/streaming-session-end';
import type { StreamingSessionStart } from './streaming-metrics/streaming-session-start';

export type BaseEvent = {
  client: {
    platform: 'web';
    token: string;
    version: string;
  };
  ts: number;
  user: {
    accessToken: string;
    clientId: number;
    id: number;
  };
  uuid: string;
  version: number;
};

export type PrematureEvents =
  | DrmLicenseFetch
  | PlaybackInfoFetch
  | PlaybackSession
  | PlaybackStatistics
  | Progress
  | StreamingSessionEnd
  | StreamingSessionStart;

export type CommitData = {
  accessToken: string;
  apiUrl: string;
  appVersion: string;
  clientId: string;
  clientPlatform: string;
  eventUrl: string;
  events:
    | Array<PrematureEvents | undefined>
    | Array<Promise<PrematureEvents | undefined>>;
  ts: number;
  type: 'play_log' | 'playback' | 'streaming_metrics';
};
