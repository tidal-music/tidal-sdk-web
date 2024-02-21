import type { CredentialsProvider } from '@tidal-music/common';
import createClient, { type Middleware } from 'openapi-fetch';

import type { paths } from './catalogueAPI';

/**
 * Create a Catalogue API client with the provided credentials.
 *
 * @param credentialsProvider The credentials provider.
 */
export function createCatalogueClient(
  credentialsProvider: CredentialsProvider,
) {
  const authMiddleware: Middleware = {
    async onRequest(req) {
      const credentials = await credentialsProvider.getCredentials();

      // add Authorization header to every request
      req.headers.set('Authorization', `Bearer ${credentials.token}`);
      return req;
    },
  };

  const catalogueClient = createClient<paths>({
    baseUrl: 'https://openapi.tidal.com/',
    headers: {
      'Content-Type': 'application/vnd.tidal.v1+json',
    },
  });
  catalogueClient.use(authMiddleware);

  return catalogueClient;
}
