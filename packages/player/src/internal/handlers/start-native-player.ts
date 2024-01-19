import { getNativePlayer, setActivePlayer } from '../../player/index';

/**
 * Start native player before playback to access output devices.
 */
export async function startNativePlayer() {
  const nativePlayer = await getNativePlayer();

  setActivePlayer(nativePlayer);
}
