export { progress } from './progress';

import { commit as beaconCommit, worker } from '../../beacon/index';
import type { CommitData } from '../../beacon/types';
import { runIfAuthorizedWithUser } from '../../helpers/run-if-authorized-with-user';

/**
 * Send event to event system scoped to playback category.
 */
export function commit(data: Pick<CommitData, 'events'>) {
  return runIfAuthorizedWithUser(() =>
    beaconCommit(worker, {
      ...data,
      type: 'playback' as const,
    }),
  );
}
