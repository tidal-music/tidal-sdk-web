import { playerState } from '../../player/state';

/**
 * Perform a seek on the active player.
 *
 * @param {number} time - seconds
 */
export async function seek(time: number): Promise<number | void> {
  const { activePlayer: player } = playerState;

  return player?.seek(time);
}
