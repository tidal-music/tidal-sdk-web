import { events } from '../../event-bus';
import { playerState } from '../../player/state';
import { trueTime } from '../true-time';

/**
 * Start playback of active media product.
 *
 * Playback will start and state transition to PLAYING.
 *
 * If there is no media product previously loaded with
 * the load method, this method will do nothing.
 *
 * @returns {Promise<void>}
 * @see {@link import('../../api/event/playback-state-change').PlaybackStateChange}
 */
export async function play() {
  await trueTime.synchronize();

  const { activePlayer: player } = playerState;

  if (!player) {
    return Promise.reject(new Error('No active player'));
  }

  events.dispatchEvent(new CustomEvent('user-action'));

  return player.play();
}
