export { playbackSession, playbackSessionAction } from './playback-session';

import { commit as baseCommit } from '../index';
import type { Events } from '../types';

/**
 * Send event to event system scoped to play_log category.
 */
export async function commit(data: Events) {
  for await (const event of data) {
    if (event) {
      await baseCommit({
        group: 'play_log',
        name: event.name,
        payload: event.payload,
        version: 2,
      });
    }
  }
}
