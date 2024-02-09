import * as auth from '@tidal-music/auth';

import * as Player from '../dist';

Player.events.addEventListener('ended', () => {
  document.dispatchEvent(new CustomEvent('player-sdk:ended'));
});

Player.events.addEventListener('media-product-transition', () => {
  document.dispatchEvent(
    new CustomEvent('player-sdk:media-product-transition'),
  );
});

export const waitFor = ms => new Promise(r => setTimeout(r, ms));

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

let outputEl;

export function print(s) {
  if (!outputEl && 'document' in globalThis) {
    outputEl = document.querySelector('output');
  }

  if (outputEl) {
    outputEl.textContent += `\n\r\n${s}`;
  }
}

const printEvent = e => {
  if (outputEl) {
    print(`${e.type}: ${JSON.stringify(e.detail)}`);
  }
};

Player.events.addEventListener('playback-state-change', e => printEvent(e));
Player.events.addEventListener('media-product-transition', e => printEvent(e));
Player.events.addEventListener('ended', e => printEvent(e));
