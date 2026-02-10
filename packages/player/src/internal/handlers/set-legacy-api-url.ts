import * as Config from '../../config';

/**
 * Configure the module to use a custom URL for legacy API endpoints (e.g. playbackinfo, rt/connect).
 *
 * @param legacyApiUrl - URL for the legacy API.
 */
export function setLegacyApiUrl(legacyApiUrl: string) {
  // eslint-disable-next-line no-useless-catch
  try {
    new URL(legacyApiUrl);
  } catch (e) {
    throw e;
  }

  Config.update({ legacyApiUrl });
}
