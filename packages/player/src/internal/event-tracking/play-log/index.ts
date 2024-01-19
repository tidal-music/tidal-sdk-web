export { playbackSession, playbackSessionAction } from './playback-session';

import { commit as beaconCommit, worker } from '../../beacon/index';
import type { CommitData } from '../../beacon/types';
import { runIfAuthorizedWithUser } from '../../helpers/run-if-authorized-with-user';

/**
 * Send event to event system scoped to play_log category.
 */
export function commit(data: Pick<CommitData, 'events'>) {
  return runIfAuthorizedWithUser(() =>
    beaconCommit(worker, {
      type: 'play_log' as const,
      ...data,
    }),
  );
}
