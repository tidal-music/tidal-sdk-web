import type { PlaybackSession } from '../event-tracking/play-log/playback-session';

import type { BaseEvent } from './types';

export type PlayLogEvent = BaseEvent & {
  group: 'play_log' | 'play_log_open';
  version: 2;
};

export type PlaybackSessionEvent = PlayLogEvent & PlaybackSession;
