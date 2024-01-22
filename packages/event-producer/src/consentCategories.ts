export type ConsentCategory =
  /**
   * The event is considered strictly necessary. End users cannot opt out of strictly necessary events.
   */
  | 'NECESSARY'
  /**
   * The event is used e.g. for tracking the performance and usage of the app.
   * End users can opt out of performance events. Also called analytics.
   */
  | 'PERFORMANCE'
  /**
   * The event is used e.g. for advertisement. End users can opt out of targeting events. Also called advertising.
   */
  | 'TARGETING';

export type ConsentCategories = Record<ConsentCategory, boolean>;

/**
 * The default consent categories.
 * NECCESSARY is set to false, since it is not possible to opt out of strictly necessary events.
 * PERFORMANCE and TARGETING are set to true, since they are optional and opt in.
 *
 * @type {ConsentCategories}
 */
export const defaultConsentCategories: ConsentCategories = {
  NECESSARY: false,
  PERFORMANCE: true,
  TARGETING: true,
};
