export { playbackSession, playbackSessionAction } from './playback-session';

import { commit as baseCommit } from '../index';
import type { CommitData } from '../types';

/**
 * Send event to event system scoped to play_log category.
 */
export async function commit(data: Pick<CommitData, 'events'>) {
  for await (const event of data.events) {
    if (event) {
      await baseCommit({
        group: 'play_log',
        name: event.name,
        payload: event.payload,
        version: 1,
      });
    }
  }
}
