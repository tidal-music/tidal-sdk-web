import type { CredentialsProvider } from '@tidal-music/common';
import createClient, { type Middleware } from 'openapi-fetch';

import type { paths } from './playlistAPI';

/**
 * Create a Playlist API client with the provided credentials.
 *
 * @param credentialsProvider The credentials provider, from Auth module.
 */
export function createPlaylistClient(credentialsProvider: CredentialsProvider) {
  const authMiddleware: Middleware = {
    async onRequest(req) {
      const credentials = await credentialsProvider.getCredentials();

      // Add Authorization header to every request
      req.headers.set('Authorization', `Bearer ${credentials.token}`);
      return req;
    },
  };

  const playlistClient = createClient<paths>({
    baseUrl: 'https://openapi.tidal.com/v2/',
  });
  playlistClient.use(authMiddleware);

  return playlistClient;
}
