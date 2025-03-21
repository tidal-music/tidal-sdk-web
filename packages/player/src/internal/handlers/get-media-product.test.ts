import { expect } from 'chai';

import * as Player from '../../index';
import { waitFor } from '../../test-helpers';

import { getMediaProduct } from './get-media-product';

describe('getMediaProduct', () => {
  beforeEach(async () => {
    await Player.reset();
  });

  it('returns undefined if there is no active player', () => {
    const activeMediaProduct = getMediaProduct();

    expect(activeMediaProduct).to.equal(null);
  });

  it('returns the media product', function () {
    this.timeout(10000);

    const test = async () => {
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

      const activeMediaProduct = getMediaProduct();

      expect(activeMediaProduct).to.equal({
        productId: '141120674',
        productType: 'track',
        sourceId: 'tidal-player-tests',
        sourceType: 'tidal-player-tests',
      });
    };

    return test;
  });
});
