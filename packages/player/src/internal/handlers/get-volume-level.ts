import * as Config from '../../config';

/**
 * Gets current volume level.
 *
 * @returns {number}
 */
export function getVolumeLevel(): number {
  return Config.get('desiredVolumeLevel');
}
