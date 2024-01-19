import * as Config from '../../config';

/**
 * Tells TIDAL Player which client platform Player is running on. Used for streaming metrics.
 *
 * Must be called when bootstrapping TIDAL Player.
 *
 * @param {string} clientPlatform
 */
export function setClientPlatform(clientPlatform: string) {
  Config.update({
    clientPlatform,
  });
}
