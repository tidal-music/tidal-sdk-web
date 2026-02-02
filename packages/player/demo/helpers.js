import * as auth from '@tidal-music/auth';
import * as eventProducer from '@tidal-music/event-producer';

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
  // Get test user credentials from Cypress (in Cypress tests) or from env (in dev mode)
  let testUser;
  if (window.Cypress) {
    testUser = window.Cypress.env('credentials');
  } else {
    // Parse TEST_USER from environment variable (available via vite config)
    const testUserEnv = import.meta.env.TEST_USER;
    if (!testUserEnv) {
      throw new Error(
        'TEST_USER environment variable not set. Make sure .env file exists.',
      );
    }
    testUser = JSON.parse(atob(testUserEnv));
  }

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

  eventProducer.init({
    appInfo: { appName: 'YourApp', appVersion: '1.2.3' },
    // Used to initialize the blockedConsentCategories property
    blockedConsentCategories: {
      NECESSARY: false,
      PERFORMANCE: true,
      TARGETING: true,
    },
    // An access token provider, from @tidal-music/auth.
    credentialsProvider: auth.credentialsProvider,
    // platform details
    platform: {
      browserName: 'Ice Hippo',
      browserVersion: '1.2.3',
      osName: 'Some OS',
    },
    // URI identifying the TL Consumer ingest endpoint.
    tlConsumerUri: 'http://localhost:5173/fakeeventurl',
    // URI for unauthorized event batches.
    tlPublicConsumerUri: 'http://localhost:5173/fakeeventurl',
  });

  Player.setCredentialsProvider(auth.credentialsProvider);
  Player.setEventSender(eventProducer);
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
