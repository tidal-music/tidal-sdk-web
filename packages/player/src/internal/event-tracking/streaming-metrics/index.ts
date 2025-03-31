export { drmLicenseFetch } from './drm-license-fetch';
export { playbackInfoFetch } from './playback-info-fetch';
export { playbackStatistics } from './playback-statistics';
export { streamingSessionEnd } from './streaming-session-end';
export { streamingSessionStart } from './streaming-session-start';

import { runIfAuthorizedWithUser } from '../../helpers/run-if-authorized-with-user';
import { commit as baseCommit } from '../index';
import type { Events } from '../types';

/**
 * Send event to event system scoped to streaming_metrics category.
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
