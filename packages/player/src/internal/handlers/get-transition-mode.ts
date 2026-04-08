import * as Config from '../../config';

/**
 * Gets current track transition mode value.
 *
 * @returns {number} Positive = crossfade ms, 0 = gapless, negative = gap ms
 */
export function getTransitionMode() {
  return Config.get('crossfadeInMs');
}
