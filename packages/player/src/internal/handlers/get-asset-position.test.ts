import { expect } from 'chai';

import * as Player from '../../index';
import { waitFor } from '../../test-helpers';

import { getAssetPosition } from './get-asset-position';

describe('getAssetPosition', () => {
  it('returns 0 if there is no active player', () => {
    const playerPosition = getAssetPosition();

    expect(playerPosition).to.equal(0);
  });

  it('return currentTime if there is a player', async () => {
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
