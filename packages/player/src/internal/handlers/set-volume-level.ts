import * as Config from '../../config';

/**
 * Set the desired volume level. Range 0-100. This level will be used for all players,
 * but when loudness normalization is active it will be adjusted inside the player.
 *
 * @param {number} desiredVolumeLevel
 */
export function setVolumeLevel(desiredVolumeLevel: number) {
  Config.update({
    desiredVolumeLevel,
  });
}
