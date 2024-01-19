import type { PlaybackState } from '../../api/interfaces';
import { playerState } from '../../player/state';

/**
 * Get the current playback state of the active player.
 *
 * @returns {PlaybackState}
 */
export function getPlaybackState(): PlaybackState {
  const player = playerState.activePlayer;

  return player?.playbackState ?? 'IDLE';
}
