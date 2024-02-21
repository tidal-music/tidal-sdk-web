// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import { credentialsProvider } from '../../test-helpers';

import { fetchPlaybackInfo } from './playback-info-resolver';

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

    expect(result.assetPresentation).toEqual('PREVIEW');
    expect(result.manifestMimeType).not.toEqual(undefined);
    expect(result.manifest).not.toEqual(undefined);
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

    expect(result.assetPresentation).toEqual('FULL');
    expect(result.manifestMimeType).not.toEqual(undefined);
    expect(result.manifest).not.toEqual(undefined);
  });
});
