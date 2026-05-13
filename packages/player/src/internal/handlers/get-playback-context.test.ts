import { expect } from 'chai';

import * as Player from '../../index.js';
import { authAndEvents, waitFor } from '../../test-helpers.js';

import { getPlaybackContext } from './get-playback-context.js';

describe('getPlaybackContext', () => {
  authAndEvents(before, after);

  it('returns undefined if there is no active player', () => {
    const activePlaybackContext = getPlaybackContext();

    expect(activePlaybackContext).to.equal(undefined);
  });

  it('returns the playback context', async () => {
    Player.setStreamingWifiAudioQuality('LOW');

    await Player.load(
      {
        productId: '141120674',
        productType: 'track',
        sourceId: 'tidal-player-tests',
        sourceType: 'tidal-player-tests',
      },
      0,
    );

    await Player.play();

    await waitFor(2000);

    const activePlaybackContext = getPlaybackContext();

    if (!activePlaybackContext) {
      throw new Error('No playback context, cannot fulfill test');
    }

    expect(activePlaybackContext.actualProductId).to.equal('141120674');
  });
});
