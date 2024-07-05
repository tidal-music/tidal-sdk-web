import { getNativePlayer, setActivePlayer } from '../../player/index';

/**
 * Start native player before playback to access output devices.
 */
export async function startNativePlayer(): Promise<void> {
  const nativePlayer = await getNativePlayer();

  setActivePlayer(nativePlayer);
}
