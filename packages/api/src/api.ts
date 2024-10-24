import type { CredentialsProvider } from '@tidal-music/common';
import createClient, { type Middleware } from 'openapi-fetch';

import type { paths as cataloguePaths } from './catalogueAPI.generated';
import type { paths as playlistPaths } from './playlistAPI.generated';
import type { paths as searchPaths } from './searchAPI.generated';
import type { paths as userPaths } from './userAPI.generated';

/**
 * Create a Catalogue API client with the provided credentials.
 *
 * @param credentialsProvider The credentials provider, from Auth module.
 */
export function createAPIClient(credentialsProvider: CredentialsProvider) {
  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      const credentials = await credentialsProvider.getCredentials();

      // Add Authorization header to every request
      request.headers.set('Authorization', `Bearer ${credentials.token}`);
      return request;
    },
  };

  type AllPaths = cataloguePaths & playlistPaths & searchPaths & userPaths;

  const apiClient = createClient<AllPaths>({
    baseUrl: 'https://openapi.tidal.com/v2/',
  });
  apiClient.use(authMiddleware);

  return apiClient;
}
