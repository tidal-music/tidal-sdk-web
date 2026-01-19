import { expect } from 'chai';

import { authAndEvents, credentialsProvider } from '../../test-helpers';

import { fetchPlaybackInfo } from './playback-info-resolver';

describe('playbackInfoResolver', () => {
  authAndEvents(before, after);

  it('fetches playback info via legacy API if there is only clientId defined, gets preview', async () => {
    const { clientId } = await credentialsProvider.getCredentials();

    // Use playerType: 'native' to test the legacy v1 playbackinfo endpoint
    // which supports preview access without a full access token
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
      playerType: 'native',
      prefetch: false,
      // eslint-disable-next-line no-restricted-syntax
      streamingSessionId: 'tidal-player-js-test-' + Date.now(),
    });

    expect(result.assetPresentation).to.equal('PREVIEW');
    expect(result.manifestMimeType).to.not.equal(undefined);
    expect(result.manifest).to.not.equal(undefined);
  });

  it('fetches playback info via legacy API if there is an accessToken defined, gets full', async () => {
    const { clientId, token } = await credentialsProvider.getCredentials();

    if (!token) {
      throw new Error('No access token, cannot fulfill test.');
    }

    // Use playerType: 'native' to test the legacy v1 playbackinfo endpoint
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
      playerType: 'native',
      prefetch: false,
      // eslint-disable-next-line no-restricted-syntax
      streamingSessionId: 'tidal-player-js-test-' + Date.now(),
    });

    expect(result.assetPresentation).to.equal('FULL');
    expect(result.manifestMimeType).to.not.equal(undefined);
    expect(result.manifest).to.not.equal(undefined);
  });

  it('fetches playback info via new trackManifests API for shaka player', async () => {
    const { clientId, token } = await credentialsProvider.getCredentials();

    if (!token) {
      throw new Error('No access token, cannot fulfill test.');
    }

    // Default behavior (no playerType or playerType: 'shaka') uses new trackManifests API
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
      playerType: 'shaka',
      prefetch: false,
      // eslint-disable-next-line no-restricted-syntax
      streamingSessionId: 'tidal-player-js-test-' + Date.now(),
    });

    expect(result.assetPresentation).to.equal('FULL');
    expect(result.manifestMimeType).to.not.equal(undefined);
    expect(result.manifest).to.not.equal(undefined);
  });
});
