import { expect } from 'chai';

import * as Player from '../../index';
import {
  authAndEvents,
  getPreloadedStreamingSessionId,
} from '../../test-helpers';

describe('load', () => {
  authAndEvents(before, after);

  it('re-uses a next for loading if it is the same media product', async () => {
    await Player.load(
      {
        productId: '1766030',
        productType: 'track',
        sourceId: 'tidal-player-tests',
        sourceType: 'tidal-player-tests',
      },
      0,
    );

    await Player.play();

    await Player.setNext({
      productId: '37704290',
      productType: 'track',
      sourceId: 'next-call',
      sourceType: 'next-call',
    });

    const preloadedStreamingSessionId = getPreloadedStreamingSessionId();

    await Player.load({
      productId: '37704290',
      productType: 'track',
      sourceId: 'load-call',
      sourceType: 'load-call',
    });

    await Player.play();

    const playbackContext = Player.getPlaybackContext();

    if (!playbackContext) {
      throw new Error('No playback context, cannot fulfill test');
    }

    expect(playbackContext.playbackSessionId).to.equal(
      preloadedStreamingSessionId,
    );
  });
});
