import { expect } from 'chai';

import * as Player from '../../index';
import { authAndEvents, waitFor } from '../../test-helpers';

import { getNextMediaProduct } from './get-next-media-product';

describe('getMediaProduct', () => {
  authAndEvents(before, after);

  beforeEach(async () => {
    await Player.reset();
  });

  it('returns null if there is no active player', () => {
    const nextMediaProduct = getNextMediaProduct();

    expect(nextMediaProduct).to.equal(null);
  });

  it('returns null if there is nothing set as next', async () => {
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
    await waitFor(500);

    const nextMediaProduct = getNextMediaProduct();

    expect(nextMediaProduct).to.equal(null);
  });

  it('returns the media product that was set as next', async () => {
    const mediaProduct1: Player.MediaProduct = {
      productId: '141120674',
      productType: 'track',
      sourceId: 'tidal-player-tests',
      sourceType: 'tidal-player-tests',
    };
    const mediaProduct2: Player.MediaProduct = {
      productId: '3142609',
      productType: 'track',
      sourceId: 'tidal-player-tests',
      sourceType: 'tidal-player-tests',
    };

    await Player.load(mediaProduct1, 0);

    await Player.play();

    await waitFor(500);

    await Player.setNext(mediaProduct2);

    const nextMediaProduct = getNextMediaProduct();

    expect(nextMediaProduct).to.equal(mediaProduct2);
  });
});
