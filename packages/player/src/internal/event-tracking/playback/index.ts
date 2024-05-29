export { progress } from './progress';

import { commit as baseCommit } from '../index';
import type { Events } from '../types';

/**
 * Send event to event system scoped to playback category.
 */
export async function commit(events: Events) {
  for await (const event of events) {
    if (event) {
      await baseCommit({
        group: 'playback',
        name: event.name,
        payload: event.payload,
        version: 1,
      });
    }
  }
}
