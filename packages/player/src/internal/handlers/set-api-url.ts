import * as Config from '../../config';

/**
 * Configure the module to use a custom URL for the OpenAPI API (e.g. track manifests).
 *
 * @param apiUrl - URL for the main (OpenAPI) API.
 */
export function setApiUrl(apiUrl: string) {
  // eslint-disable-next-line no-useless-catch
  try {
    new URL(apiUrl);
  } catch (e) {
    throw e;
  }

  Config.update({ apiUrl });
}
