import type { CredentialsProvider } from '@tidal-music/common';
import createClient, { type Middleware } from 'openapi-fetch';

import type { paths } from './searchAPI';

/**
 * Create a Search API client with the provided credentials.
 *
 * @param credentialsProvider The credentials provider, from Auth module.
 */
export function createSearchClient(credentialsProvider: CredentialsProvider) {
  const authMiddleware: Middleware = {
    async onRequest(req) {
      const credentials = await credentialsProvider.getCredentials();

      // Add Authorization header to every request
      req.headers.set('Authorization', `Bearer ${credentials.token}`);
      return req;
    },
  };

  const searchClient = createClient<paths>({
    baseUrl: 'https://openapi.tidal.com/v2/',
  });
  searchClient.use(authMiddleware);

  return searchClient;
}
