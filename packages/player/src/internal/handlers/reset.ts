import {
  cancelQueuedOnendedHandler,
  resetAllPlayers,
} from '../../player/index';
import ConnectionHandler from '../services/connection-handler';

/**
 * Gracefully reset to a clean initial state. Stops playback, removes any
 * setNext:ed items and makes sure each sub-player is reset also.
 *
 * Playback state will immediately change to IDLE.
 *
 * @returns {Promise<void>}
 * @see {@link import('../../api/event/playback-state-change').PlaybackStateChange}
 */
export async function reset() {
  cancelQueuedOnendedHandler();
  ConnectionHandler.disable();

  await resetAllPlayers();
}
