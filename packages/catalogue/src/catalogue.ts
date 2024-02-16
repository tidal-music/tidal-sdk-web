import type { CredentialsProvider } from '@tidal-music/common';
import createClient from 'openapi-fetch';

import type { paths } from './catalogueAPI';

let authToken: string | undefined = undefined;

/**
 * Initializes the client with the provided credentials.
 *
 * @param credentialsProvider The credentials provider.
 */
export async function initCatalogueClient(
  credentialsProvider: CredentialsProvider,
) {
  const credentials = await credentialsProvider.getCredentials();
  authToken = credentials.token;
  //TODO: listen for changes to the token
}

export const catalogueClient = createClient<paths>({
  baseUrl: 'https://openapi.tidal.com/',
  headers: {
    get Authorization() {
      return authToken ? `Bearer ${authToken}` : undefined;
    },
    'Content-Type': 'application/vnd.tidal.v1+json',
  },
});
