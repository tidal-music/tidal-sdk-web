import type { MediaProduct } from '../../api/interfaces.js';
import { playerState } from '../../player/state.js';

/**
 * Gets the next media product. This is the same value as
 * was included in the last successful call to setNext.
 *
 * Gets unset to return null on media-product-transition and
 * on player resets.
 *
 * @returns {MediaProduct | null}
 */
export function getNextMediaProduct(): MediaProduct | null {
  return playerState.preloadedMediaProduct ?? null;
}
