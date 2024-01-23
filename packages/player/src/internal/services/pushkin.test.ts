import { credentialsProvider } from '../../test-helpers';

import { fetchWebSocketURL, socketOpen } from './pushkin';

describe('Pushkin', () => {
  // eslint-disable-next-line vitest/expect-expect
  it('socketOpen resolved when passed in web socket emits open event', async () => {
    const { token } = await credentialsProvider.getCredentials();

    if (token) {
      const wsUrl = await fetchWebSocketURL(token);
      const webSocket = new WebSocket(wsUrl);

      return socketOpen(webSocket);
    }
  });
});
