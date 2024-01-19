export { drmLicenseFetch } from './drm-license-fetch';
export { playbackInfoFetch } from './playback-info-fetch';
export { playbackStatistics } from './playback-statistics';
export { streamingSessionEnd } from './streaming-session-end';
export { streamingSessionStart } from './streaming-session-start';

import { commit as beaconCommit, worker } from '../../beacon/index';
import type { CommitData } from '../../beacon/types';
import { runIfAuthorizedWithUser } from '../../helpers/run-if-authorized-with-user';

/**
 * Send event to event system scoped to streaming_metrics category.
 */
export function commit(data: Pick<CommitData, 'events'>) {
  return runIfAuthorizedWithUser(() =>
    beaconCommit(worker, {
      type: 'streaming_metrics',
      ...data,
    }),
  );
}
