import type { MediaProduct, PlaybackContext } from '../interfaces';

/**
 * Playback engine has recently made a transition to requested mediaProduct X.
 *
 * Implicit media product transitions can be assumed to occur exactly when this event is sent.
 *
 * Information about the active playback session is given in playbackContext.
 */
export type MediaProductTransitionPayload = {
  mediaProduct: MediaProduct;
  playbackContext: PlaybackContext;
};

export type MediaProductTransition = CustomEvent<MediaProductTransitionPayload>;

export function mediaProductTransition(
  mediaProduct: MediaProduct,
  playbackContext: PlaybackContext,
): MediaProductTransition {
  return new CustomEvent<MediaProductTransitionPayload>(
    'media-product-transition',
    {
      detail: {
        mediaProduct,
        playbackContext,
      },
    },
  );
}
