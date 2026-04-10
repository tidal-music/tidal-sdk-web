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
      audioAdaptiveBitrateStreaming: true,
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
      audioAdaptiveBitrateStreaming: true,
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

  it('fetches playback info via new trackManifests API for shaka player with ABR enabled (multiple qualities)', async () => {
    const { clientId, token } = await credentialsProvider.getCredentials();

    if (!token) {
      throw new Error('No access token, cannot fulfill test.');
    }

    // Default behavior (no playerType or playerType: 'shaka') uses new trackManifests API
    const result = await fetchPlaybackInfo({
      accessToken: token,
      audioAdaptiveBitrateStreaming: true,
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

    // Decode manifest and verify it contains multiple representations (ABR)
    const decodedManifest = atob(result.manifest);

    // For DASH manifests, count Representation elements
    // For HLS manifests, count EXT-X-STREAM-INF entries
    const isDash = result.manifestMimeType === 'application/dash+xml';
    const representationCount = isDash
      ? (decodedManifest.match(/<Representation/g) ?? []).length
      : (decodedManifest.match(/#EXT-X-STREAM-INF/g) ?? []).length;

    expect(
      representationCount,
      'ABR manifest should contain multiple quality representations',
    ).to.be.greaterThan(1);
  });

  it('fetches playback info via new videoManifests API for video products', async () => {
    const { clientId, token } = await credentialsProvider.getCredentials();

    if (!token) {
      throw new Error('No access token, cannot fulfill test.');
    }

    const result = await fetchPlaybackInfo({
      accessToken: token,
      audioAdaptiveBitrateStreaming: true,
      audioQuality: 'HIGH',
      clientId,
      mediaProduct: {
        productId: '75623239',
        productType: 'video',
        sourceId: '',
        sourceType: '',
      },
      playerType: 'shaka',
      prefetch: false,
      // eslint-disable-next-line no-restricted-syntax
      streamingSessionId: 'tidal-player-js-test-' + Date.now(),
    });

    expect(result.assetPresentation).to.not.equal(undefined);
    expect(result.manifestMimeType).to.not.equal(undefined);
    expect(result.manifest).to.not.equal(undefined);

    expect('videoId' in result).to.equal(true);
    if ('videoId' in result) {
      expect(result.videoId).to.equal(75623239);
      expect(result.videoQuality).to.equal('HIGH');
      expect(result.streamType).to.equal('ON_DEMAND');
    }
  });

  it('fetches playback info with ABR disabled (single quality)', async () => {
    const { clientId, token } = await credentialsProvider.getCredentials();

    if (!token) {
      throw new Error('No access token, cannot fulfill test.');
    }

    // Test with audioAdaptiveBitrateStreaming: false (fixed quality mode)
    const result = await fetchPlaybackInfo({
      accessToken: token,
      audioAdaptiveBitrateStreaming: false,
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

    // Decode manifest and verify it contains only one representation (fixed quality)
    const decodedManifest = atob(result.manifest);

    // For DASH manifests, count Representation elements
    // For HLS manifests, count EXT-X-STREAM-INF entries
    const isDash = result.manifestMimeType === 'application/dash+xml';
    const representationCount = isDash
      ? (decodedManifest.match(/<Representation/g) ?? []).length
      : (decodedManifest.match(/#EXT-X-STREAM-INF/g) ?? []).length;

    expect(
      representationCount,
      'Non-ABR manifest should contain exactly one quality representation',
    ).to.equal(1);
  });
});
