import * as Config from '../../config';

/**
 * What endpoint the module should send events to.
 *
 * @param {string} eventUrl
 */
export function setEventUrl(eventUrl: string) {
  // eslint-disable-next-line no-useless-catch
  try {
    // eslint-disable-next-line no-new
    new URL(eventUrl);
  } catch (e) {
    throw e;
  }

  Config.update({
    eventUrl,
  });
}
