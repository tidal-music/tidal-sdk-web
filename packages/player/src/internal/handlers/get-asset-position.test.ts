// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import * as Player from '../../index';
import { waitFor } from '../../test-helpers';

import { getAssetPosition } from './get-asset-position';

describe('getAssetPosition', () => {
  it('returns 0 if there is no active player', () => {
    const playerPosition = getAssetPosition();

    expect(playerPosition).toEqual(0);
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

    expect(playerPosition).toBeGreaterThanOrEqual(0.5);
  });
});
