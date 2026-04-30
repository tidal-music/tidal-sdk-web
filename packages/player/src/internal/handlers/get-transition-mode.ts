import * as Config from '../../config';

/**
 * Gets current track transition mode value.
 *
 * @returns {number} 0 = gapless, positive = crossfade duration in ms
 */
export function getTransitionMode() {
  return Config.get('crossfadeInMs');
}
