import * as Config from '../../config';

/**
 * Configure the module to use another URL for the API than the normal one.
 *
 * @param {string} apiUrl
 */
export function setApiUrl(apiUrl: string) {
  // eslint-disable-next-line no-useless-catch
  try {
    // eslint-disable-next-line no-new
    new URL(apiUrl);
  } catch (e) {
    throw e;
  }

  Config.update({
    apiUrl,
  });
}
