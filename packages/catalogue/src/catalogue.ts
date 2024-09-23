import type { CredentialsProvider } from '@tidal-music/common';
import createClient, { type Middleware } from 'openapi-fetch';

import type { paths } from './catalogueAPI';

/**
 * Create a Catalogue API client with the provided credentials.
 *
 * @param credentialsProvider The credentials provider, from Auth module.
 */
export function createCatalogueClient(
  credentialsProvider: CredentialsProvider,
) {
  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      const credentials = await credentialsProvider.getCredentials();

      // Add Authorization header to every request
      request.headers.set('Authorization', `Bearer ${credentials.token}`);
      return request;
    },
  };

  const catalogueClient = createClient<paths>({
    baseUrl: 'https://openapi.tidal.com/v2/',
  });
  catalogueClient.use(authMiddleware);

  return catalogueClient;
}
