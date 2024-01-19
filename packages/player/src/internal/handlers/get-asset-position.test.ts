import { expect } from '@esm-bundle/chai';

import * as Player from '../../index';
import { credentialsProvider, waitFor } from '../../test-helpers';
import { trueTime } from '../true-time';

import { getAssetPosition } from './get-asset-position';

describe('getAssetPosition', () => {
  beforeEach(async () => {
    await trueTime.synchronize();
  });

  it('returns 0 if there is no active player', () => {
    const playerPosition = getAssetPosition();

    expect(playerPosition).to.equal(0);
  });

  it('return currentTime if there is a player', async () => {
    Player.setCredentialsProvider(credentialsProvider);

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

    const playerPosition = getAssetPosition();

    expect(playerPosition).to.be.greaterThanOrEqual(0.5);
  });
});
