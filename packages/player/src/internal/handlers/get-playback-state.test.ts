// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import * as Player from '../../index';
import { waitFor } from '../../test-helpers';

import { getPlaybackState } from './get-playback-state';

describe('getPlaybackState', () => {
  it('returns IDLE if there is no active player', () => {
    const activeState = getPlaybackState();

    expect(activeState).toEqual('IDLE');
  });

  it('return NOT_PLAYING when a media product is loaded', async () => {
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

    expect(getPlaybackState()).toEqual('NOT_PLAYING');
  });

  it('return PLAYING when a media product is playing', async () => {
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

    expect(getPlaybackState()).toEqual('NOT_PLAYING');

    await Player.play();

    await waitFor(2000);

    expect(getPlaybackState()).toEqual('PLAYING');
  });
});
