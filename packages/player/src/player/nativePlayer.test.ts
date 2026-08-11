import { expect } from 'chai';

import type { EndedEvent } from '../api/event/ended.js';
import type { MediaProductTransition } from '../api/event/media-product-transition.js';
import type { MediaProduct, PlaybackContext } from '../api/interfaces.js';
import { events } from '../event-bus.js';
import type { StreamInfo } from '../internal/helpers/manifest-parser.js';
import { streamingSessionStore } from '../internal/helpers/streaming-session-store.js';

import { BasePlayer } from './basePlayer.js';
import NativePlayer from './nativePlayer.js';
import { playerState } from './state.js';

/**
 * Minimal stand-in for the native player component. The real component
 * delivers events as `{ target }` objects, so we keep our own listener
 * registry and `emit` them the same way instead of going through the DOM
 * EventTarget (which would overwrite `event.target`).
 */
class MockNativeComponent {
  #listeners = new Map<string, Set<(e: unknown) => void>>();

  addEventListener(name: string, handler: (e: unknown) => void) {
    if (!this.#listeners.has(name)) {
      this.#listeners.set(name, new Set());
    }

    this.#listeners.get(name)?.add(handler);
  }

  cancelPreload() {}

  emit(name: string, target: unknown) {
    for (const handler of [...(this.#listeners.get(name) ?? [])]) {
      handler({ target });
    }
  }

  load() {}

  pause() {}

  play() {}

  preload() {}

  removeEventListener(name: string, handler: (e: unknown) => void) {
    this.#listeners.get(name)?.delete(handler);
  }

  seek() {}

  selectSystemDevice() {}

  setVolume() {}

  stop() {}
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function mediaProduct(productId: string): MediaProduct {
  return {
    productId,
    productType: 'track',
    sourceId: 'tidal-player-tests',
    sourceType: 'tidal-player-tests',
  };
}

function playbackContext(sessionId: string): PlaybackContext {
  return {
    actualAssetPresentation: 'FULL',
    actualAudioMode: 'STEREO',
    actualAudioQuality: 'LOSSLESS',
    actualDuration: 20,
    actualProductId: '1',
    actualStreamType: 'ON_DEMAND',
    actualVideoQuality: null,
    assetPosition: 0,
    bandwidth: null,
    bitDepth: 16,
    codec: 'flac',
    playbackSessionId: sessionId,
    sampleRate: 44100,
  };
}

/** Seeds the store so the session looks like a started, playing product. */
function seedStartedProduct(sessionId: string) {
  streamingSessionStore.saveStreamInfo(sessionId, {
    expires: 9_999_999_999_999,
    streamingSessionId: sessionId,
  } as unknown as StreamInfo);
  streamingSessionStore.saveMediaProductTransition(sessionId, {
    mediaProduct: mediaProduct(sessionId),
    playbackContext: playbackContext(sessionId),
  });
  streamingSessionStore.setStartedStreamInfo(sessionId);
}

/** Seeds the store so the session looks like a preloaded next product. */
function seedPreloadedProduct(sessionId: string) {
  streamingSessionStore.saveStreamInfo(sessionId, {
    expires: 9_999_999_999_999,
    streamingSessionId: sessionId,
  } as unknown as StreamInfo);
  streamingSessionStore.saveMediaProductTransition(sessionId, {
    mediaProduct: mediaProduct(sessionId),
    playbackContext: playbackContext(sessionId),
  });
}

function createNativePlayer() {
  const native = new MockNativeComponent();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Test mock
  window.NativePlayerComponent = { Player: () => native };

  return { native, player: new NativePlayer() };
}

describe('NativePlayer gapless transitions', () => {
  const created: Array<string> = [];

  afterEach(() => {
    playerState.activePlayer = undefined;
    playerState.preloadPlayer = undefined;

    for (const sessionId of created) {
      streamingSessionStore.deleteSession(sessionId);
    }

    created.length = 0;
  });

  it("does not leak an 'ended' event and transitions to the preloaded product on a gapless boundary", async () => {
    const current = 'gapless-current';
    const next = 'gapless-next';
    created.push(current, next);
    seedStartedProduct(current);
    seedPreloadedProduct(next);

    const { native, player } = createNativePlayer();
    player.currentStreamingSessionId = current;
    player.preloadedStreamingSessionId = next;
    player.currentTime = 20;
    playerState.activePlayer = player;
    playerState.preloadPlayer = player;

    const endedEvents: Array<EndedEvent> = [];
    const transitions: Array<MediaProductTransition> = [];
    const onEnded = (e: Event) => endedEvents.push(e as EndedEvent);
    const onTransition = (e: Event) =>
      transitions.push(e as MediaProductTransition);
    events.addEventListener('ended', onEnded);
    events.addEventListener('media-product-transition', onTransition);

    // Native pipeline reports the outgoing track finished; playback has
    // already continued into the preloaded track.
    native.emit('mediastate', 'completed');
    // handleAutomaticTransitionToPreloadedMediaProduct awaits these.
    native.emit('mediaduration', 20);
    await flush();
    native.emit('mediastate', 'active');
    await flush();

    events.removeEventListener('ended', onEnded);
    events.removeEventListener('media-product-transition', onTransition);

    expect(endedEvents.length).to.equal(0);
    expect(player.currentStreamingSessionId).to.equal(next);
    expect(
      transitions.some(e => e.detail.mediaProduct.productId === next),
    ).to.equal(true);
  });

  it("emits an 'ended' event on the final track boundary when nothing is preloaded", () => {
    const current = 'final-current';
    created.push(current);
    seedStartedProduct(current);

    const { native, player } = createNativePlayer();
    player.currentStreamingSessionId = current;
    player.currentTime = 20;

    const endedEvents: Array<EndedEvent> = [];
    const onEnded = (e: Event) => endedEvents.push(e as EndedEvent);
    events.addEventListener('ended', onEnded);

    native.emit('mediastate', 'completed');

    events.removeEventListener('ended', onEnded);

    expect(endedEvents.length).to.equal(1);
    expect(endedEvents[0]?.detail.reason).to.equal('completed');
  });
});

describe('BasePlayer.mediaProductStarted preload bookkeeping', () => {
  const created: Array<string> = [];

  afterEach(() => {
    for (const sessionId of created) {
      streamingSessionStore.deleteSession(sessionId);
    }

    created.length = 0;
  });

  it('clears the preload when the started session is the one that was preloaded', () => {
    const started = 'started-match';
    created.push(started);

    const player = new BasePlayer();
    player.preloadedStreamingSessionId = started;

    player.mediaProductStarted(started);

    expect(player.preloadedStreamingSessionId).to.equal(undefined);
  });

  it('keeps a replacement preload registered mid-transition (setNext race)', () => {
    const started = 'started-race';
    const replacement = 'replacement-preload';
    created.push(started, replacement);

    const player = new BasePlayer();
    // A setNext() landing during the transition replaced the preload with a
    // different session than the one that just started.
    player.preloadedStreamingSessionId = replacement;

    player.mediaProductStarted(started);

    expect(player.preloadedStreamingSessionId).to.equal(replacement);
  });
});
