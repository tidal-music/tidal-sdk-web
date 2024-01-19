import { expect } from '@esm-bundle/chai';

import * as Player from '../../index';
import { credentialsProvider, waitFor } from '../../test-helpers';
import { trueTime } from '../true-time';

import { getPlaybackState } from './get-playback-state';

describe('getPlaybackState', () => {
  beforeEach(async () => {
    await trueTime.synchronize();
  });

  it('returns IDLE if there is no active player', () => {
    const activeState = getPlaybackState();

    expect(activeState).to.equal('IDLE');
  });

  it('return NOT_PLAYING when a media product is loaded', async () => {
    Player.setCredentialsProvider(credentialsProvider);
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

    expect(getPlaybackState()).to.equal('NOT_PLAYING');
  });

  it('return PLAYING when a media product is playing', async () => {
    Player.setCredentialsProvider(credentialsProvider);
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

    await waitFor(2000);

    expect(getPlaybackState()).to.equal('NOT_PLAYING');

    await Player.play();

    await waitFor(2000);

    expect(getPlaybackState()).to.equal('PLAYING');
  });
});
