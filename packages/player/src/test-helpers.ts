/* eslint-disable no-console */
import * as Auth from '@tidal-music/auth';
import * as EventProducer from '@tidal-music/event-producer';

import { playerState } from './player/state';

export { waitFor } from './internal/helpers/wait-for';

import * as Player from './index';

export function getPreloadedStreamingSessionId() {
  return playerState.preloadedStreamingSessionId;
}

type User = {
  clientId: string;
  oAuthAccessToken: string;
  oAuthExpirationDate: number;
  oAuthRefreshToken: string;
  userId: number;
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
// @ts-expect-error Environment variable
const user = JSON.parse(atob(process.env.TEST_USER)) as User;
const scopes = ['r_usr', 'w_usr'];

export async function setupAuthAndEvents() {
  await Auth.init({
    clientId: user.clientId,
    clientUniqueKey: 'FALLBACK',
    credentialsStorageKey: 'FALLBACK',
    scopes,
  });

  await Auth.setCredentials({
    accessToken: {
      clientId: user.clientId,
      clientUniqueKey: 'FALLBACK',
      expires: user.oAuthExpirationDate,
      grantedScopes: scopes,
      requestedScopes: scopes,
      token: user.oAuthAccessToken ?? '',
    },
    refreshToken: user.oAuthRefreshToken,
  });

  await EventProducer.init({
    appInfo: { appName: 'TIDAL SDK Player Module test', appVersion: '0.0.0' },
    blockedConsentCategories: {
      NECESSARY: false,
      PERFORMANCE: false,
      TARGETING: false,
    },
    credentialsProvider: Auth.credentialsProvider,
    platform: {
      browserName: 'Web Test Runner',
      browserVersion: '0.0.0',
      osName: 'GitHub Actions',
    },
    strictMode: false,
    tlConsumerUri:
      'https://event-collector.obelix-staging-use1.tidalhi.fi/api/event-batch',
    tlPublicConsumerUri:
      'https://event-collector.obelix-staging-use1.tidalhi.fi/api/public/event-batch',
  });

  Player.setCredentialsProvider(Auth.credentialsProvider);
  Player.setEventSender(EventProducer);
}

export const credentialsProvider = Auth.credentialsProvider;

export function waitForEvent(target: EventTarget, eventName: string) {
  return new Promise(resolve => {
    target.addEventListener(eventName, event => resolve(event), false);
  });
}

class NativePlayerMock extends EventTarget {
  listDevices() {
    console.log('Native Player Mock: listDevices');
  }

  load() {
    console.log('Native Player Mock: load');
    this.dispatchEvent(
      new Event('mediaduration', {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Test mock
        target: 20,
      }),
    );
    this.dispatchEvent(
      new Event('mediastate', {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Test mock
        target: 'active',
      }),
    );
  }

  play() {
    console.log('Native Player Mock: play');
  }

  setVolume() {
    console.log('Native Player Mock: setVolume');
  }

  stop() {
    console.log('Native Player Mock: stop');
  }
}

export function mockNativePlayer() {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.NativePlayerComponent = {
    Player: () => new NativePlayerMock(),
  };
}
