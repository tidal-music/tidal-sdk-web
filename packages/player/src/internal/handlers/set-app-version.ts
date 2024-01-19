import * as Config from '../../config';

/**
 * Tells TIDAL Player which string to use for the version key in event tracking.
 *
 * Must be called when bootstrapping TIDAL Player.
 *
 * @param {string} appVersion
 */
export function setAppVersion(appVersion: string) {
  Config.update({
    appVersion,
  });
}
