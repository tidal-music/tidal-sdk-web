/* eslint-disable no-console */
import type { Credentials, CredentialsProvider } from '@tidal-music/common';

import { playerState } from './player/state';

export { waitFor } from './internal/helpers/wait-for';

type User = {
  clientId: string;
  oAuthAccessToken: string;
  oAuthExpirationDate: number;
  oAuthRefreshToken: string;
  userId: number;
};
type UserStore = Record<string, User>;

export function getPreloadedStreamingSessionId() {
  return playerState.preloadedStreamingSessionId;
}

export const users: UserStore = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  autohino: JSON.parse(atob(process.env.TEST_USER)),
};

/**
 * Get test user
 */
export async function getTestUser(
  user: User = users.autohino,
): Promise<Credentials> {
  if (user.oAuthAccessToken) {
    return {
      clientId: user.clientId,
      requestedScopes: ['READ', 'WRITE'],
      token: user.oAuthAccessToken,
    };
  }

  const body = new URLSearchParams({
    client_id: user.clientId,
    client_unique_key: '',
    grant_type: 'refresh_token',
    refresh_token: user.oAuthRefreshToken,
    scope: 'r_usr w_usr',
  });

  const response = await fetch('https://login.tidal.com/oauth2/token', {
    body: body.toString(),
    headers: new Headers({
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    }),
    method: 'POST',
  });
  const json = (await response.json()) as { access_token: string };

  user.oAuthAccessToken = json.access_token;

  return {
    clientId: user.clientId,
    requestedScopes: ['READ', 'WRITE'],
    token: json.access_token,
  };
}

export function waitForEvent(target: EventTarget, eventName: string) {
  return new Promise(resolve => {
    target.addEventListener(eventName, event => resolve(event), false);
  });
}

class TestCredentialsProvider implements CredentialsProvider {
  bus() {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async getCredentials() {
    return getTestUser();
  }
}

export const credentialsProvider = new TestCredentialsProvider();

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
