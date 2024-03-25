export { drmLicenseFetch } from './drm-license-fetch';
export { playbackInfoFetch } from './playback-info-fetch';
export { playbackStatistics } from './playback-statistics';
export { streamingSessionEnd } from './streaming-session-end';
export { streamingSessionStart } from './streaming-session-start';

import { commit as baseCommit } from '../index';
import type { Events } from '../types';

/**
 * Send event to event system scoped to streaming_metrics category.
 */
export async function commit(events: Events) {
  for await (const event of events) {
    if (event) {
      await baseCommit({
        group: 'streaming_metrics',
        name: event.name,
        payload: event.payload,
        version: 2,
      });
    }
  }
}
