import { expect } from 'chai';

import type { MediaProductTransition } from '../../api/event/media-product-transition.js';
import { events } from '../../event-bus.js';
import * as Player from '../../index.js';
import { playerState } from '../../player/state.js';
import { authAndEvents, waitForEvent } from '../../test-helpers.js';
import { waitFor } from '../helpers/wait-for.js';

describe('ConnectionHandler', () => {
  authAndEvents(before, after);

  it('reloads the mediaProduct when connection was lost and player stopped playing', async () => {
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

    await Player.play();

    // Let it play a bit
    await waitFor(1000);

    // Fake offline event
    window.dispatchEvent(new Event('offline'));

    // Fake that playback stops due to offline.
    playerState.activePlayer?.pause();

    // Let it be in the offline playback stopped state a bit
    await waitFor(1000);

    // Fake online event
    window.dispatchEvent(new Event('online'));

    const event = await waitForEvent(events, 'media-product-transition');

    const playbackContextTwo = Player.getPlaybackContext();

    if (!playbackContextTwo) {
      throw new Error('PlaybackContext is null, cannot fulfil test');
    }

    expect(
      (event as MediaProductTransition).detail.mediaProduct.productId,
    ).to.equal('141120674');
    expect(playbackContextTwo.playbackSessionId).to.not.equal(
      playbackContextOne.playbackSessionId,
    );
  });
});
