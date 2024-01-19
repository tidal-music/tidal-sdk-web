import type { Progress } from '../event-tracking/playback/progress';

import type { BaseEvent } from './types';

type PlaybackEvent = BaseEvent & {
  group: 'playback';
  version: 1;
};

export type ProgressEvent = PlaybackEvent & Progress;
