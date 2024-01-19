import { expect } from '@esm-bundle/chai';

import * as Player from '../../index';
import { credentialsProvider, waitFor } from '../../test-helpers';
import { trueTime } from '../true-time';

import { getPlaybackContext } from './get-playback-context';

describe('getPlaybackContext', () => {
  beforeEach(async () => {
    await trueTime.synchronize();
  });

  it('returns undefined if there is no active player', () => {
    const activePlaybackContext = getPlaybackContext();

    expect(activePlaybackContext).to.equal(undefined);
  });

  it('returns the playback context', async () => {
    Player.setCredentialsProvider(credentialsProvider);
    Player.setStreamingWifiAudioQuality('LOW');

    console.debug('load');
    await Player.load(
      {
        productId: '141120674',
        productType: 'track',
        sourceId: 'tidal-player-tests',
        sourceType: 'tidal-player-tests',
      },
      0,
    );

    console.debug('play');
    await Player.play();

    console.debug('waitFor 2s');
    await waitFor(2000);

    const activePlaybackContext = getPlaybackContext();

    if (!activePlaybackContext) {
      throw new Error('No playback context, cannot fulfill test');
    }

    expect(activePlaybackContext.actualProductId).to.equal('141120674');
  });
});
