import type { CredentialsProvider } from '@tidal-music/common';

import type { BlockedConsentCategories } from './blockedConsentCategories';
import type { AppInfo, PlatformData } from './types';

/**
 *
 * In order to simplify the implementation while still maintaining correct function, high performance
 * and reduced load on backend, a design decision has been made that the EventSender
 * shall only ever exist in one instance.
 */

export type Config = {
  appInfo: AppInfo;
  // Used to initialize the blockedConsentCategories property
  blockedConsentCategories: BlockedConsentCategories;
  // An access token provider, used by the EventProducer to get access token.
  credentialsProvider?: CredentialsProvider;
  // frequency of sending events to TL Consumer
  eventBatchInterval?: number;
  // event types to exclude from persisted memory, ie a malformed event from a previous release
  feralEventTypes?: Array<string>;
  // frequency of monitoring info sending
  monitoringInterval?: number;
  platform: PlatformData;
  // Debug for integration purposes. Check if consentCategory is missing.
  strictMode?: boolean;
  // URI identifying the TL Consumer ingest endpoint.
  tlConsumerUri: string;
  // URI for unauthorized event batches.
  tlPublicConsumerUri: string;
};

/**
 * The current configuration instance.
 */

let _config: Config;

/**
 * Initializes the configuration instance.
 *
 * @param {Config} config
 */
export const init = (config: Config) => {
  _config = config;
};

/**
 * Sets the credentials provider.
 *
 * @param {CredentialsProvider} credentialsProvider
 */
export const setCredentialsProvider = (
  credentialsProvider: CredentialsProvider,
) => {
  _config.credentialsProvider = credentialsProvider;
};

type SetConsentCategoryParams = {
  PERFORMANCE?: boolean;
  TARGETING?: boolean;
};
/**
 * Turns on or of blocking of optional consent levels (PERFORMANCE or TARGETING).
 *
 * @param {SetConsentCategoryParams} consentLevel
 */
export const setConsentCategory = (consentLevel: SetConsentCategoryParams) => {
  _config.blockedConsentCategories = {
    ..._config.blockedConsentCategories,
    ...consentLevel,
  };
};

/**
 * Returns the current configuration instance.
 *
 * @returns {Config}
 */
export const getConfig = (): Config => _config;
