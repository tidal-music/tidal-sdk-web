import type { PlaybackContext } from '../interfaces';

export type PlaybackQualityChangedPayload = {
  playbackContext: PlaybackContext;
};

export type PlaybackQualityChanged = CustomEvent<PlaybackQualityChangedPayload>;

/**
 * Message fired when playback quality changes during ABR (Adaptive Bitrate) streaming.
 * This occurs when the adaptive bitrate switches to a different quality variant mid-playback.
 *
 * Information about the active playback session is given in playbackContext.
 */
export function playbackQualityChanged(
  playbackContext: PlaybackContext,
): PlaybackQualityChanged {
  return new CustomEvent<PlaybackQualityChangedPayload>(
    'playback-quality-changed',
    {
      detail: {
        playbackContext,
      },
    },
  );
}
