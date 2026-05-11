import * as auth from '@tidal-music/auth';
import * as eventProducer from '@tidal-music/event-producer';

import * as Player from '../dist';

const noopEventSender = {
  sendEvent() {
    // Manual demo runs do not need analytics batching; Cypress uses the real
    // event producer so e2e tests can assert the batched play-log payloads.
  },
};

Player.events.addEventListener('ended', () => {
  document.dispatchEvent(new CustomEvent('player-sdk:ended'));
});

Player.events.addEventListener('media-product-transition', () => {
  document.dispatchEvent(
    new CustomEvent('player-sdk:media-product-transition'),
  );
});

Player.events.addEventListener('preload-request', () => {
  document.dispatchEvent(new CustomEvent('player-sdk:preload-request'));
});

export const waitFor = ms => new Promise(r => setTimeout(r, ms));

let loginPromise;

export async function login() {
  if (loginPromise) {
    return loginPromise;
  }

  loginPromise = performLogin().catch(error => {
    loginPromise = undefined;
    throw error;
  });

  return loginPromise;
}

async function performLogin() {
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

  Player.setCredentialsProvider(auth.credentialsProvider);

  if (window.Cypress) {
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
      tlConsumerUri: `${window.location.origin}/fakeeventurl`,
      // URI for unauthorized event batches.
      tlPublicConsumerUri: `${window.location.origin}/fakeeventurl`,
    });

    Player.setEventSender(eventProducer);
  } else {
    Player.setEventSender(noopEventSender);
  }
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
