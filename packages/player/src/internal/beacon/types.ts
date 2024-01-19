import type { PlaybackSession } from '../../internal/event-tracking/play-log/playback-session';
import type { Progress } from '../../internal/event-tracking/playback/progress';
import type { DrmLicenseFetch } from '../../internal/event-tracking/streaming-metrics/drm-license-fetch';
import type { PlaybackInfoFetch } from '../../internal/event-tracking/streaming-metrics/playback-info-fetch';
import type { PlaybackStatistics } from '../../internal/event-tracking/streaming-metrics/playback-statistics';
import type { StreamingSessionEnd } from '../../internal/event-tracking/streaming-metrics/streaming-session-end';
import type { StreamingSessionStart } from '../../internal/event-tracking/streaming-metrics/streaming-session-start';

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
