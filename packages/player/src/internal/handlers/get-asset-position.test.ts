import { expect } from 'chai';

import * as Player from '../../index.js';
import { authAndEvents, waitFor } from '../../test-helpers.js';

import { getAssetPosition } from './get-asset-position.js';

describe('getAssetPosition', () => {
  authAndEvents(before, after);

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
