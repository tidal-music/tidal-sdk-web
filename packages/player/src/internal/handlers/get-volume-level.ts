import * as Config from '../../config.js';

/**
 * Gets current volume level.
 *
 * @returns {number}
 */
export function getVolumeLevel() {
  return Config.get('desiredVolumeLevel');
}
