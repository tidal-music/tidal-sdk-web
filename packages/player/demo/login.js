import * as auth from '@tidal-music/auth';

import * as Player from '../dist';

export async function login() {
  const testUser = window.Cypress.env('credentials');

  const scopes = ['r_usr', 'w_usr'];

  await auth.init({
    clientId: testUser.clientId,
    clientUniqueKey: 'player-cypress-test',
    scopes,
  });

  await auth.setCredentials({
    accessToken: {
      clientId: testUser.clientId,
      clientUniqueKey: 'player-cypress-test',
      expires: testUser.oAuthExpirationDate,
      grantedScopes: scopes,
      requestedScopes: scopes,
      token: testUser.oAuthAccessToken,
    },
    refreshToken: testUser.oAuthRefreshToken,
  });

  Player.setCredentialsProvider(auth.credentialsProvider);
}
