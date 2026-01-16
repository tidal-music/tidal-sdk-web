import { expect } from 'chai';

import * as Player from '../../index';
import { authAndEvents, waitFor } from '../../test-helpers';

import { getPlaybackState } from './get-playback-state';

describe('getPlaybackState', () => {
  authAndEvents(before, after);

  it('returns correct playback states', async () => {
    // IDLE if there is no active player
    expect(getPlaybackState()).to.equal('IDLE');

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

    // NOT_PLAYING when a media product is loaded
    expect(getPlaybackState()).to.equal('NOT_PLAYING');

    await Player.play();

    await waitFor(2000);

    // PLAYING when a media product is playing
    expect(getPlaybackState()).to.equal('PLAYING');
  });
});
