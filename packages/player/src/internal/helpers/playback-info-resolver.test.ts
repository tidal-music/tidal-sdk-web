import { expect } from 'chai';

import type { MediaProduct } from 'api/interfaces';

import { credentialsProvider } from '../../test-helpers';
import { mimeTypes } from '../constants';

import {
  type Options,
  fetchPlaybackInfo,
  getDemoPlaybackInfo,
} from './playback-info-resolver';

describe('playbackInfoResolver', () => {
  it('fetches playback info if there is only clientId defined, gets preview', async () => {
    const { clientId } = await credentialsProvider.getCredentials();

    const result = await fetchPlaybackInfo({
      accessToken: undefined,
      audioQuality: 'LOSSLESS',
      clientId,
      mediaProduct: {
        productId: '1316405',
        productType: 'track',
        sourceId: '',
        sourceType: '',
      },
      prefetch: false,
      // eslint-disable-next-line no-restricted-syntax
      streamingSessionId: 'tidal-player-js-test-' + Date.now(),
    });

    expect(result.assetPresentation).to.equal('PREVIEW');
    expect(result.manifestMimeType).to.not.equal(undefined);
    expect(result.manifest).to.not.equal(undefined);
  });

  it('fetches playback info if there is an accessToken defined, gets full', async () => {
    const { clientId, token } = await credentialsProvider.getCredentials();

    if (!token) {
      throw new Error('No access token, cannot fulfill test.');
    }

    const result = await fetchPlaybackInfo({
      accessToken: token,
      audioQuality: 'LOSSLESS',
      clientId,
      mediaProduct: {
        productId: '1316405',
        productType: 'track',
        sourceId: '',
        sourceType: '',
      },
      prefetch: false,
      // eslint-disable-next-line no-restricted-syntax
      streamingSessionId: 'tidal-player-js-test-' + Date.now(),
    });

    expect(result.assetPresentation).to.equal('FULL');
    expect(result.manifestMimeType).to.not.equal(undefined);
    expect(result.manifest).to.not.equal(undefined);
  });

  it('gets playback info for demo content', async () => {
    const { clientId, token } = await credentialsProvider.getCredentials();

    // eslint-disable-next-line no-restricted-syntax
    const streamingSessionId = `tidal-player-js-test-${Date.now()}`;

    const mediaProduct: MediaProduct = {
      productId: '1316405',
      productType: 'demo',
      sourceId: '',
      sourceType: '',
    };

    const options: Options = {
      accessToken: token,
      audioQuality: 'LOW',
      clientId,
      mediaProduct,
      prefetch: false,
      streamingSessionId,
    };

    const playbackInfo = getDemoPlaybackInfo(options);

    expect(playbackInfo).to.deep.include({
      assetPresentation: 'FULL',
      audioMode: 'STEREO',
      audioQuality: 'LOW',
      // eslint-disable-next-line no-restricted-syntax
      manifest: btoa(
        JSON.stringify({
          mimeType: mimeTypes.HLS,
          urls: [
            `https://fsu.fa.tidal.com/storage/${mediaProduct.productId}.m3u8`,
          ],
        }),
      ),
      manifestMimeType: mimeTypes.EMU,
      prefetched: false,
      streamType: 'ON_DEMAND',
      streamingSessionId,
      trackId: mediaProduct.productId,
    });

    expect(playbackInfo.expires).to.be.a('number');
  });
});
