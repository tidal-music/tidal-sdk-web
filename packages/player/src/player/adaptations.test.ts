import { expect } from 'chai';
import type shaka from 'shaka-player';

import type { PlaybackQualityChangedPayload } from '../api/event/playback-quality-changed';
import type { MediaProduct, PlaybackContext } from '../api/interfaces';
import { events } from '../event-bus';
import * as StreamingMetrics from '../internal/event-tracking/streaming-metrics/index';
import { streamingSessionStore } from '../internal/helpers/streaming-session-store';
import { trueTime } from '../internal/true-time';

import {
  registerAdaptations,
  saveAdaptation,
  shakaTrackToAdaptation,
} from './adaptations';

await trueTime.synchronize();

describe('shakaTrackToAdaptation', () => {
  it('generates an adaptation object for streaming metrics', () => {
    // Raw output from shaka
    const shakaTrack = JSON.parse(
      '{"id":0,"active":true,"type":"variant","bandwidth":983528,"language":"und","label":null,"kind":null,"width":null,"height":null,"frameRate":null,"pixelAspectRatio":null,"hdr":null,"mimeType":"audio/mp4","codecs":"flac","audioCodec":"flac","videoCodec":null,"primary":false,"roles":[],"audioRoles":[],"forced":false,"videoId":null,"audioId":1,"channelsCount":null,"audioSamplingRate":44100,"spatialAudio":false,"tilesLayout":null,"audioBandwidth":983528,"videoBandwidth":null,"originalVideoId":null,"originalAudioId":"0","originalTextId":null,"originalImageId":null}',
    );
    const adaptation = shakaTrackToAdaptation(shakaTrack, 0);

    // Mocked media element
    expect(adaptation.assetPosition).to.equal(0);
    expect(adaptation.bandwidth).to.equal(983528);
    expect(adaptation.codecs).to.equal('flac');

    // No width and height since the asserted shaka track is a audio only.
    expect(adaptation.videoWidth).to.equal(null);
    expect(adaptation.videoHeight).to.equal(null);
  });
});

describe('saveAdaptation', () => {
  it('saves the adaptation in streaming metrics', async () => {
    const activeShakaTrack = JSON.parse(
      '{"id":6,"active":true,"type":"variant","bandwidth":3117998,"language":"und","label":null,"kind":null,"width":1280,"height":720,"frameRate":null,"pixelAspectRatio":null,"hdr":null,"mimeType":"video/mp2t","codecs":"avc1.4D401F,mp4a.40.2","audioCodec":null,"videoCodec":"avc1.4D401F,mp4a.40.2","primary":false,"roles":[],"audioRoles":null,"forced":false,"videoId":5,"audioId":null,"channelsCount":null,"audioSamplingRate":null,"spatialAudio":false,"tilesLayout":null,"audioBandwidth":null,"videoBandwidth":null,"originalVideoId":null,"originalAudioId":null,"originalTextId":null,"originalImageId":null}',
    );
    const adaptation = await saveAdaptation(
      'jeremy-session',
      activeShakaTrack,
      1337,
    );
    const event = await StreamingMetrics.playbackStatistics({
      streamingSessionId: 'jeremy-session',
    });

    if (!event) {
      throw new Error('Event undefined');
    }

    expect(event.payload.adaptations[0]).to.deep.equal(adaptation);
  });
});

describe('registerAdaptations', () => {
  const testSessionId = 'adaptation-test-session';
  const testMediaProduct: MediaProduct = {
    productId: '12345',
    productType: 'track',
    sourceId: 'test-source',
    sourceType: 'test',
  };
  const testPlaybackContext: PlaybackContext = {
    actualAssetPresentation: 'FULL',
    actualAudioMode: 'STEREO',
    actualAudioQuality: 'LOSSLESS',
    actualDuration: 200,
    actualProductId: '12345',
    actualStreamType: 'ON_DEMAND',
    actualVideoQuality: null,
    assetPosition: 0,
    bandwidth: null,
    bitDepth: 16,
    codec: 'flac',
    playbackSessionId: testSessionId,
    sampleRate: 44100,
  };

  // Create a mock shaka player
  function createMockShakaPlayer() {
    const listeners: Record<string, Array<EventListener>> = {};
    const activeTrack = {
      active: true,
      audioCodec: 'flac',
      audioSamplingRate: 96000,
      bandwidth: 2000000,
      codecs: 'flac',
      mimeType: 'audio/mp4',
      originalAudioId: 'FLAC,96000,24',
    } as shaka.extern.Track;

    return {
      addEventListener: (event: string, handler: EventListener) => {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(handler);
      },
      getMediaElement: () => ({ currentTime: 10 }) as HTMLMediaElement,
      getVariantTracks: () => [activeTrack],
      removeEventListener: (event: string, handler: EventListener) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter(h => h !== handler);
        }
      },
      // Helper to trigger events for testing
      triggerEvent: (eventName: string, eventData?: Partial<Event>) => {
        const event = new Event(eventName);
        if (eventData) {
          Object.assign(event, eventData);
        }
        listeners[eventName]?.forEach(handler => handler(event));
      },
    };
  }

  afterEach(() => {
    streamingSessionStore.deleteSession(testSessionId);
  });

  it('dispatches playback-quality-changed event on adaptation event', done => {
    const mockPlayer = createMockShakaPlayer();

    // Setup: save a media product transition
    streamingSessionStore.saveMediaProductTransition(testSessionId, {
      mediaProduct: testMediaProduct,
      playbackContext: testPlaybackContext,
    });

    // Register adaptations
    const unregister = registerAdaptations(
      mockPlayer as unknown as shaka.Player,
      () => ({ current: undefined, preloaded: undefined }),
    );

    // Simulate media-product-transition to set the currentStreamingSessionId
    events.dispatchEvent(
      new CustomEvent('media-product-transition', {
        detail: {
          mediaProduct: testMediaProduct,
          playbackContext: testPlaybackContext,
        },
      }),
    );

    // Listen for the playback-quality-changed event
    const handler = (e: Event) => {
      events.removeEventListener('playback-quality-changed', handler);
      const customEvent = e as CustomEvent<PlaybackQualityChangedPayload>;

      expect(customEvent.detail.playbackContext.actualAudioQuality).to.equal(
        'HI_RES_LOSSLESS',
      );
      expect(customEvent.detail.playbackContext.bandwidth).to.equal(2000000);
      expect(customEvent.detail.playbackContext.sampleRate).to.equal(96000);

      unregister();
      done();
    };

    events.addEventListener('playback-quality-changed', handler);

    // Trigger adaptation event with only allowed properties (conform to type Partial<Event>)
    mockPlayer.triggerEvent('adaptation', {
      // @ts-expect-error: newTrack is not actually part of shaka.util.FakeEvent but we need to simulate it for testing purposes
      newTrack: {
        active: true,
        audioCodec: 'flac',
        audioSamplingRate: 96000,
        bandwidth: 2000000,
        originalAudioId: 'FLAC,96000,24',
      } as shaka.extern.Track,
    });
  });

  it('updates streaming session store on adaptation event', () => {
    const mockPlayer = createMockShakaPlayer();

    // Setup: save a media product transition
    streamingSessionStore.saveMediaProductTransition(testSessionId, {
      mediaProduct: testMediaProduct,
      playbackContext: testPlaybackContext,
    });

    // Register adaptations
    const unregister = registerAdaptations(
      mockPlayer as unknown as shaka.Player,
      () => ({ current: undefined, preloaded: undefined }),
    );

    // Simulate media-product-transition to set the currentStreamingSessionId
    events.dispatchEvent(
      new CustomEvent('media-product-transition', {
        detail: {
          mediaProduct: testMediaProduct,
          playbackContext: testPlaybackContext,
        },
      }),
    );

    // Trigger adaptation event with only allowed properties (conform to type Partial<Event>)
    mockPlayer.triggerEvent('adaptation', {
      // @ts-expect-error: newTrack is not actually part of shaka.util.FakeEvent but we need to simulate it for testing purposes
      newTrack: {
        active: true,
        audioCodec: 'flac',
        audioSamplingRate: 96000,
        bandwidth: 2000000,
        originalAudioId: 'FLAC,96000,24',
      } as shaka.extern.Track,
    });

    // Verify store was updated
    const updated =
      streamingSessionStore.getMediaProductTransition(testSessionId);
    expect(updated).to.not.equal(undefined);
    expect(updated?.playbackContext.actualAudioQuality).to.equal(
      'HI_RES_LOSSLESS',
    );
    expect(updated?.playbackContext.bandwidth).to.equal(2000000);

    unregister();
  });

  it('removes event listeners on unregister', () => {
    const mockPlayer = createMockShakaPlayer();

    const unregister = registerAdaptations(
      mockPlayer as unknown as shaka.Player,
      () => ({ current: undefined, preloaded: undefined }),
    );

    // Unregister should be a function and complete without error
    expect(unregister).to.be.a('function');
    unregister();
  });
});
