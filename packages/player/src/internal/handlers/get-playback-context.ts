import type { PlaybackContext } from '../../api/interfaces';
import { playerState } from '../../player/state';
import { streamingSessionStore } from '../helpers/streaming-session-store';

/**
 * Gets the currently active playback context. This is the same value
 * as was included in the last sent MediaProductTransition event. If nothing
 * is loaded in the player yet or if the player was reset, undefined will be
 * returned.
 *
 * @returns {PlaybackContext | undefined}
 */
export function getPlaybackContext(): PlaybackContext | undefined {
  const player = playerState.activePlayer;

  if (player) {
    const mtp = streamingSessionStore.getMediaProductTransition(
      player.currentStreamingSessionId,
    );

    if (mtp) {
      return mtp.playbackContext;
    }
  }

  return undefined;
}
