export { drmLicenseFetch } from './drm-license-fetch.js';
export { playbackInfoFetch } from './playback-info-fetch.js';
export { playbackStatistics } from './playback-statistics.js';
export { streamingSessionEnd } from './streaming-session-end.js';
export { streamingSessionStart } from './streaming-session-start.js';

import { runIfAuthorizedWithUser } from '../../helpers/run-if-authorized-with-user.js';
import { commit as baseCommit } from '../index.js';
import type { Events } from '../types.js';

/**
 * Send event to event system scoped to streaming_metrics group.
 */
export async function commit(events: Events) {
  return runIfAuthorizedWithUser(async () => {
    for (const event of events) {
      if (event) {
        const resolvedEvent = await event;
        if (resolvedEvent) {
          await baseCommit({
            group: 'streaming_metrics',
            name: resolvedEvent.name,
            payload: resolvedEvent.payload,
            version: 2,
          });
        }
      }
    }
  });
}
