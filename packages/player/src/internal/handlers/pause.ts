import { playerState } from '../../player/state';

/**
 * Pause playback of active media product in the active player.
 *
 * Playback will pause and state transition to NOT_PLAYING.
 *
 * @see {@link PlaybackStateChange}
 */
export function pause() {
  return playerState.activePlayer?.pause();
}
