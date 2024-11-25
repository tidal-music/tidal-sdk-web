import type { DrmLicenseFetch } from '../event-tracking/streaming-metrics/drm-license-fetch';
import type { PlaybackInfoFetch } from '../event-tracking/streaming-metrics/playback-info-fetch';
import type { PlaybackStatistics } from '../event-tracking/streaming-metrics/playback-statistics';
import type { StreamingSessionStart } from '../event-tracking/streaming-metrics/streaming-session-start';

import type { BaseEvent } from './types';

type StreamingMetricsEvent = BaseEvent & {
  group: 'streaming_metrics';
  version: 2;
};

export type StreamingSessionStartEvent = StreamingMetricsEvent &
  StreamingSessionStart;
export type PlaybackInfoFetchEvent = PlaybackInfoFetch & StreamingMetricsEvent;
export type DrmLicenceFetchEvent = DrmLicenseFetch & StreamingMetricsEvent;
export type PlaybackStatisticsEvent = PlaybackStatistics &
  StreamingMetricsEvent;
