// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import type { MediaProduct, PlaybackContext } from '../interfaces';

import { mediaProductTransition } from './media-product-transition';

describe('mediaProductTransition', () => {
  it('creates a CustomEvent with a predetermined name', () => {
    const mediaProduct: MediaProduct = {
      productId: '23',
      productType: 'track',
      sourceId: 'tidal-player-test',
      sourceType: 'tidal-player-test',
    };
    const playbackContext: PlaybackContext = {
      actualAssetPresentation: 'FULL',
      actualAudioMode: 'STEREO',
      actualAudioQuality: 'LOSSLESS',
      actualDuration: 207.61,
      actualProductId: '4347054',
      actualStreamType: 'ON_DEMAND',
      actualVideoQuality: null,
      assetPosition: 0,
      bitDepth: 16,
      codec: 'flac',
      playbackSessionId: '41386807-aa95-44bc-a992-d1198dcf1ab3',
      sampleRate: 44100,
    };
    const result = mediaProductTransition(mediaProduct, playbackContext);

    expect(result instanceof CustomEvent).toEqual(true);

    expect(result.type).toEqual('media-product-transition');

    expect(result.detail.mediaProduct).toEqual(mediaProduct);
    expect(result.detail.playbackContext).toEqual(playbackContext);
  });
});
