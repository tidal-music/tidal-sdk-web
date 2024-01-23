/* eslint-disable no-console */
import * as Auth from '@tidal-music/auth';

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

Player.setCredentialsProvider(Auth.credentialsProvider);
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
