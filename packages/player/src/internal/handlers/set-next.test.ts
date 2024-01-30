import { expect } from 'chai';

import * as Player from '../../index';
import type { MediaProduct } from '../../index';
import { waitFor } from '../../internal/helpers/wait-for';
import { credentialsProvider, waitForEvent } from '../../test-helpers';

Player.setCredentialsProvider(credentialsProvider);

describe('nextHandler', () => {
  it('doesnt preload if no mediaProduct', async () => {
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

    await Player.setNext();

    const playbackContext = Player.getPlaybackContext();

    if (!playbackContext) {
      throw new Error('No playback context, cannot fulfill test');
    }

    await Player.seek(playbackContext.actualDuration - 2);

    await waitForEvent(Player.events, 'playback-state-change');
    // Wait for product to finish playback
    await waitFor(4000);

    const state = Player.getPlaybackState();

    expect(state).to.equal('NOT_PLAYING');
  });

  it('if preloading current item (repeat one), switch streaming session ids', async () => {
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

    const playbackContextOne = Player.getPlaybackContext();

    if (!playbackContextOne) {
      throw new Error('No playback context, cannot fulfill test');
    }

    const {
      actualProductId: firstProductId,
      playbackSessionId: firstSessionId,
    } = playbackContextOne;

    await Player.setNext({
      productId: '141120674',
      productType: 'track',
      sourceId: 'tidal-player-tests',
      sourceType: 'tidal-player-tests',
    });

    await Player.seek(playbackContextOne.actualDuration - 2);

    await waitForEvent(Player.events, 'media-product-transition');

    const playbackContextTwo = Player.getPlaybackContext();

    if (!playbackContextTwo) {
      throw new Error('No playback context, cannot fulfill test');
    }

    const {
      actualProductId: secondProductId,
      playbackSessionId: secondSessionId,
    } = playbackContextTwo;

    expect(firstProductId).to.equal(secondProductId);
    expect(firstSessionId).to.not.equal(secondSessionId);
  });

  it('repeat 1 works 3 times in a row', async () => {
    const testMediaProduct = (id: string) =>
      ({
        productId: '141120674',
        productType: 'track',
        sourceId: 'tidal-player-tests--' + id,
        sourceType: 'tidal-player-tests--' + id,
      }) as MediaProduct;

    await Player.load(testMediaProduct('1'), 0);

    await Player.play();

    const playbackContextOne = Player.getPlaybackContext();

    if (!playbackContextOne) {
      throw new Error('No playback context, cannot fulfill test');
    }

    const {
      actualProductId: firstProductId,
      playbackSessionId: firstSessionId,
    } = playbackContextOne;

    await Player.setNext(testMediaProduct('2'));

    await Player.seek(playbackContextOne.actualDuration - 2);

    await waitForEvent(Player.events, 'media-product-transition');

    const playbackContextTwo = Player.getPlaybackContext();

    if (!playbackContextTwo) {
      throw new Error('No playback context, cannot fulfill test');
    }

    const {
      actualProductId: secondProductId,
      playbackSessionId: secondSessionId,
    } = playbackContextTwo;

    expect(secondProductId).to.equal(firstProductId);
    expect(secondSessionId).to.not.equal(firstSessionId);

    await Player.setNext(testMediaProduct('3'));

    await Player.seek(playbackContextTwo.actualDuration - 2);

    await waitForEvent(Player.events, 'media-product-transition');

    const playbackContextThree = Player.getPlaybackContext();

    if (!playbackContextThree) {
      throw new Error('No playback context, cannot fulfill test');
    }

    const {
      actualProductId: thirdProductId,
      playbackSessionId: thirdSessionId,
    } = playbackContextThree;

    expect(thirdProductId).to.equal(firstProductId);
    expect(thirdSessionId).to.not.equal(secondSessionId);
    expect(thirdSessionId).to.not.equal(firstSessionId);
  });

  it('plays preloaded item', async () => {
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

    await Player.setNext({
      productId: '154872415',
      productType: 'track',
      sourceId: 'tidal-player-tests',
      sourceType: 'tidal-player-tests',
    });

    const playbackContext = Player.getPlaybackContext();

    if (!playbackContext) {
      throw new Error('No playback context, cannot fulfil test');
    }

    await Player.seek(playbackContext.actualDuration - 2);

    await waitForEvent(Player.events, 'media-product-transition');

    const mediaProduct = Player.getMediaProduct();

    if (!mediaProduct) {
      throw new Error('No media product, cannot fulfil test');
    }

    expect(mediaProduct.productId).to.equal('154872415');
  });

  it('plays the last preloaded item', async () => {
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

    await Player.setNext({
      productId: '154872415',
      productType: 'track',
      sourceId: 'tidal-player-tests',
      sourceType: 'tidal-player-tests',
    });

    await waitFor(500);

    await Player.setNext({
      productId: '180319868',
      productType: 'track',
      sourceId: 'tidal-player-tests',
      sourceType: 'tidal-player-tests',
    });

    const playbackContext = Player.getPlaybackContext();

    if (!playbackContext) {
      throw new Error('No media product, cannot fulfil test');
    }

    await Player.seek(playbackContext.actualDuration - 2);

    await waitForEvent(Player.events, 'media-product-transition');

    const mediaProduct = Player.getMediaProduct();

    if (!mediaProduct) {
      throw new Error('No media product, cannot fulfil test');
    }

    expect(mediaProduct.productId).to.equal('180319868');
  });

  it('returns the same next call if next is called twice with the same media product', async () => {
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

    const promise1 = Player.setNext({
      productId: '154872415',
      productType: 'track',
      sourceId: 'tidal-player-tests',
      sourceType: 'tidal-player-tests',
    });

    const promise2 = Player.setNext({
      productId: '154872415',
      productType: 'track',
      sourceId: 'tidal-player-tests',
      sourceType: 'tidal-player-tests',
    });

    expect(promise1).to.equal(promise2);
  });
});
