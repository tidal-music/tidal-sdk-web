import { playerState } from '../../player/state';

/**
 * Get the asset position of the current playback session.
 * Defaults to 0 if nothing is playing.
 *
 * @returns {number}
 */
export function getAssetPosition() {
  const player = playerState.activePlayer;

  return player?.getPosition() ?? 0;
}
