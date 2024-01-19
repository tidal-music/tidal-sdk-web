import { expect } from '@esm-bundle/chai';

import * as Player from '../../index';
import { trueTime } from '../../internal/true-time';
import {
  credentialsProvider,
  getPreloadedStreamingSessionId,
  waitFor,
} from '../../test-helpers';

describe('load', () => {
  beforeEach(async () => {
    await trueTime.synchronize();
  });

  it('re-uses a next for loading if it is the same media product', async () => {
    Player.setCredentialsProvider(credentialsProvider);

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

    await waitFor(500);

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
