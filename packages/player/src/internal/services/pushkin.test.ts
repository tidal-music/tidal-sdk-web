import { authAndEvents, credentialsProvider } from '../../test-helpers.js';

import { fetchWebSocketURL, socketOpen } from './pushkin.js';

describe('Pushkin', () => {
  authAndEvents(before, after);

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
