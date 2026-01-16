import { expect } from 'chai';

import * as Player from '../../index';
import { authAndEvents } from '../../test-helpers';
import { waitFor } from '../helpers/wait-for';

describe('ConnectionHandler', () => {
  authAndEvents(before, after);

  it('does not reload if connection drops temporarily and player never stops playing', async () => {
    await Player.load(
      {
        productId: '141120674',
        productType: 'track',
        sourceId: 'tidal-player-tests',
        sourceType: 'tidal-player-tests',
      },
      0,
    );

    const playbackContextOne = Player.getPlaybackContext();

    if (!playbackContextOne) {
      throw new Error('PlaybackContext is null, cannot fulfil test');
    }

    // Wrap play() to handle potential AbortError if playback is interrupted
    await Player.play().catch((e: Error) => {
      if (e.name !== 'AbortError') {
        throw e;
      }
    });

    // Wait for playback to actually be playing
    let retries = 10;
    while (Player.getPlaybackState() !== 'PLAYING' && retries > 0) {
      await waitFor(200);
      retries--;
    }

    // Let it play a bit more
    await waitFor(500);

    // Fake offline event
    window.dispatchEvent(new Event('offline'));

    // Let it be in the offline playback stopped state a bit
    await waitFor(1000);

    // Fake online event
    window.dispatchEvent(new Event('online'));

    // Wait for a while so a potential wrong media product transition can dispatch
    await waitFor(1000);

    const playbackContextTwo = Player.getPlaybackContext();

    if (!playbackContextTwo) {
      throw new Error('PlaybackContext is null, cannot fulfil test');
    }

    // Assert that playback session did not renew
    expect(playbackContextOne.playbackSessionId).to.equal(
      playbackContextTwo.playbackSessionId,
    );
  });
});
