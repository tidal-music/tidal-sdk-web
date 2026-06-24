import * as EventProducer from '@tidal-music/event-producer';
import { expect } from 'chai';

import * as Player from '../../index.js';
import {
  authAndEvents,
  credentialsProvider,
  waitFor,
} from '../../test-helpers.js';

import { fetchPlaybackInfo } from './playback-info-resolver.js';

type CapturedEvent = Parameters<typeof EventProducer.sendEvent>[0];

/**
 * Replace the player's event sender with a spy that records every committed
 * event. The caller must restore the real sender afterwards.
 */
function spyOnCommittedEvents(): Array<CapturedEvent> {
  const capturedEvents: Array<CapturedEvent> = [];

  Player.setEventSender({
    ...EventProducer,
    sendEvent: (event: CapturedEvent) => {
      capturedEvents.push(event);
    },
  });

  return capturedEvents;
}

/**
 * commit() is fire-and-forget inside fetchPlaybackInfo's finally block, so poll
 * the captured events until the playback_info_fetch event(s) for this session
 * arrive, then return them.
 */
async function committedPlaybackInfoFetchEvents(
  capturedEvents: Array<CapturedEvent>,
  streamingSessionId: string,
): Promise<Array<CapturedEvent>> {
  const matches = () =>
    capturedEvents.filter(
      event =>
        event.name === 'playback_info_fetch' &&
        event.payload.streamingSessionId === streamingSessionId,
    );

  for (let attempt = 0; attempt < 50 && matches().length === 0; attempt++) {
    await waitFor(100);
  }

  return matches();
}

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
      streamingSessionId: `tidal-player-js-test-${Date.now()}`,
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
      streamingSessionId: `tidal-player-js-test-${Date.now()}`,
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
      streamingSessionId: `tidal-player-js-test-${Date.now()}`,
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
      streamingSessionId: `tidal-player-js-test-${Date.now()}`,
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

  it('fetches track manifest with shareCode provided', async () => {
    const { clientId, token } = await credentialsProvider.getCredentials();

    if (!token) {
      throw new Error('No access token, cannot fulfill test.');
    }

    const result = await fetchPlaybackInfo({
      accessToken: token,
      audioAdaptiveBitrateStreaming: true,
      audioQuality: 'LOSSLESS',
      clientId,
      mediaProduct: {
        productId: '518309787',
        productType: 'track',
        shareCode: '36d1002d-e674-48f6-bd57-626b4eb453b6',
        sourceId: '',
        sourceType: '',
      },
      playerType: 'shaka',
      prefetch: false,
      // eslint-disable-next-line no-restricted-syntax
      streamingSessionId: `tidal-player-js-test-${Date.now()}`,
    });

    expect(result.assetPresentation).to.equal('FULL');
    expect(result.manifestMimeType).to.not.equal(undefined);
    expect(result.manifest).to.not.equal(undefined);
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
      streamingSessionId: `tidal-player-js-test-${Date.now()}`,
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

  // Regression: a fetch failure must commit endReason: 'ERROR'. The error
  // fields were previously emitted via a fire-and-forget reducer call that
  // raced (and lost to) the committed event, so failures surfaced as COMPLETE.
  it('reports endReason ERROR in the committed playback_info_fetch event when the fetch fails', async () => {
    const { clientId, token } = await credentialsProvider.getCredentials();

    if (!token) {
      throw new Error('No access token, cannot fulfill test.');
    }

    const capturedEvents = spyOnCommittedEvents();

    // eslint-disable-next-line no-restricted-syntax
    const streamingSessionId = `tidal-player-js-test-error-${Date.now()}`;

    try {
      let didThrow = false;

      try {
        await fetchPlaybackInfo({
          accessToken: token,
          audioAdaptiveBitrateStreaming: true,
          audioQuality: 'LOSSLESS',
          clientId,
          // A non-existent track id returns a 4xx, which the API client does
          // not retry, so the error path is hit quickly and deterministically.
          mediaProduct: {
            productId: '99999999999',
            productType: 'track',
            sourceId: '',
            sourceType: '',
          },
          playerType: 'shaka',
          prefetch: false,
          streamingSessionId,
        });
      } catch {
        didThrow = true;
      }

      expect(
        didThrow,
        'fetchPlaybackInfo should reject when the fetch fails',
      ).to.equal(true);

      const events = await committedPlaybackInfoFetchEvents(
        capturedEvents,
        streamingSessionId,
      );
      const [playbackInfoFetchEvent] = events;

      expect(
        events,
        'exactly one playback_info_fetch event should be committed',
      ).to.have.lengthOf(1);

      if (!playbackInfoFetchEvent) {
        throw new Error('playback_info_fetch event was never committed.');
      }

      expect(playbackInfoFetchEvent.payload.endReason).to.equal('ERROR');
      expect(playbackInfoFetchEvent.payload.errorCode).to.be.a('string');
    } finally {
      // Restore the real event sender for the remaining tests.
      Player.setEventSender(EventProducer);
    }
  });

  // Symmetric guard for the regression above: a successful fetch must commit a
  // single playback_info_fetch event with endReason: 'COMPLETE' and no error.
  it('reports endReason COMPLETE in the committed playback_info_fetch event on a successful fetch', async () => {
    const { clientId, token } = await credentialsProvider.getCredentials();

    if (!token) {
      throw new Error('No access token, cannot fulfill test.');
    }

    const capturedEvents = spyOnCommittedEvents();

    // eslint-disable-next-line no-restricted-syntax
    const streamingSessionId = `tidal-player-js-test-complete-${Date.now()}`;

    try {
      await fetchPlaybackInfo({
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
        streamingSessionId,
      });

      const events = await committedPlaybackInfoFetchEvents(
        capturedEvents,
        streamingSessionId,
      );
      const [playbackInfoFetchEvent] = events;

      expect(
        events,
        'exactly one playback_info_fetch event should be committed',
      ).to.have.lengthOf(1);

      if (!playbackInfoFetchEvent) {
        throw new Error('playback_info_fetch event was never committed.');
      }

      expect(playbackInfoFetchEvent.payload.endReason).to.equal('COMPLETE');
      expect(playbackInfoFetchEvent.payload.errorCode).to.equal(null);
    } finally {
      // Restore the real event sender for the remaining tests.
      Player.setEventSender(EventProducer);
    }
  });
});
