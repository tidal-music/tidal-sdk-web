import type { CredentialsProvider } from '@tidal-music/common';

import { credentialsProviderStore } from '../index';

/**
 * Set the credentials provider TIDAL Player SDK should use for getting
 * session information
 *
 * @param {CredentialsProvider} newCredentialsProvider
 */
export function setCredentialsProvider(
  newCredentialsProvider: CredentialsProvider,
) {
  credentialsProviderStore.credentialsProvider = newCredentialsProvider;
}
