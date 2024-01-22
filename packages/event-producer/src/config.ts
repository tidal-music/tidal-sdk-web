import type { CredentialsProvider } from '@tidal-music/common';

import type { ConsentCategories } from './consentCategories';
import type { AppInfo, PlatformData } from './types';

/**
 *
 * In order to simplify the implementation while still maintaining correct function, high performance
 * and reduced load on backend, a design decision has been made that the EventSender
 * shall only ever exist in one instance.
 */

export type Config = {
  appInfo: AppInfo;
  // Used to initialize the blacklistedConsentCategories property
  blacklistedConsentCategories: ConsentCategories;
  // An access token provider, used by the EventProducer to get access token.
  credentialsProvider?: CredentialsProvider;
  // The maximum amount of disk the EventProducer is allowed to use
  // for temporarily storing events before they are sent to TL Consumer.
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
  _config.blacklistedConsentCategories = {
    ..._config.blacklistedConsentCategories,
    ...consentLevel,
  };
};

/**
 * Returns the current configuration instance.
 *
 * @returns {Config}
 */
export const getConfig = (): Config => _config;
