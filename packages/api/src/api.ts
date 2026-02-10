import type { CredentialsProvider } from '@tidal-music/common';
import createClient, { type Middleware } from 'openapi-fetch';

import type { paths } from './allAPI.generated';

/**
 * Create a Tidal API client with the provided credentials.
 *
 * @param credentialsProvider The credentials provider, from Auth module.
 * @param baseUrl Override the base URL to use for the API client.
 * @returns A Tidal API client.
 */
export function createAPIClient(
  credentialsProvider: CredentialsProvider,
  baseUrl = 'https://openapi.tidal.com/v2/',
) {
  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      const credentials = await credentialsProvider.getCredentials();

      // Add Authorization header to every request
      request.headers.set('Authorization', `Bearer ${credentials.token}`);

      // Set JsonAPI Content-Type header for requests with data
      if (
        request.method === 'POST' ||
        request.method === 'PATCH' ||
        request.method === 'DELETE'
      ) {
        request.headers.set('Content-Type', 'application/vnd.api+json');
      }

      return request;
    },
  };

  const apiClient = createClient<paths>({
    baseUrl,
  });
  apiClient.use(authMiddleware);

  return apiClient;
}
