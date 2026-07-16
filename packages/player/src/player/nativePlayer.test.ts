import { expect } from 'chai';

import { events } from '../event-bus.js';

import type { LoadPayload } from './basePlayer.js';
import NativePlayer, { EventWaitCancelledError } from './nativePlayer.js';

type Listener = (...args: Array<unknown>) => void;

/**
 * Stand-in for the native player bridge. Models Electron's contextBridge
 * semantics — a function loses its identity across the boundary, so
 * removeEventListener can never match its addEventListener — by making
 * removeEventListener a no-op. This is the leak these tests guard against.
 */
class NativePlayerComponentMock {
  listeners = new Map<string, Array<Listener>>();

  addEventListener(eventName: string, listener: Listener) {
    const list = this.listeners.get(eventName) ?? [];

    list.push(listener);
    this.listeners.set(eventName, list);
  }

  cancelPreload() {}

  emit(eventName: string, payload: unknown) {
    for (const listener of [...(this.listeners.get(eventName) ?? [])]) {
      listener(payload);
    }
  }

  listDevices() {}

  listenerCount(eventName: string) {
    return this.listeners.get(eventName)?.length ?? 0;
  }

  load() {}

  pause() {}

  play() {}

  preload() {}

  recover() {}

  releaseDevice() {}

  // No-op on purpose: see the class comment.
  removeEventListener() {}

  seek() {}

  selectDevice() {}

  selectSystemDevice() {}

  setVolume() {}

  stop() {}
}

describe('NativePlayer pending event waits', () => {
  let bridge: NativePlayerComponentMock;
  let player: NativePlayer;
  // Listeners the constructor registers; waits add at most one dispatcher per event type on top.
  let baselineMediaduration: number;
  let baselineMediastate: number;

  beforeEach(() => {
    bridge = new NativePlayerComponentMock();
    // @ts-expect-error - Mocking window.NativePlayerComponent for tests
    window.NativePlayerComponent = { Player: () => bridge };
    player = new NativePlayer();
    baselineMediaduration = bridge.listenerCount('mediaduration');
    baselineMediastate = bridge.listenerCount('mediastate');
  });

  it('resolves nativeEvent when the event arrives', async () => {
    const wait = player.nativeEvent('mediaduration');

    bridge.emit('mediaduration', { target: 100 });

    const event = (await wait) as unknown as { target: number };

    expect(event.target).to.equal(100);
  });

  it('resolves mediaStateChange only for the requested state', async () => {
    const wait = player.mediaStateChange('active');
    let settled = false;

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    wait.then(() => {
      settled = true;
    });

    bridge.emit('mediastate', { target: 'stalled' });
    await Promise.resolve();
    expect(settled).to.equal(false);

    bridge.emit('mediastate', { target: 'active' });
    expect(await wait).to.equal('active');
  });

  it('rejects pending waits on reset with EventWaitCancelledError', async () => {
    const durationWait = player.nativeEvent('mediaduration');
    const stateWait = player.mediaStateChange('active');

    await player.reset();

    const results = await Promise.allSettled([durationWait, stateWait]);

    for (const result of results) {
      expect(result.status).to.equal('rejected');
      expect((result as PromiseRejectedResult).reason).to.be.an.instanceOf(
        EventWaitCancelledError,
      );
    }
  });

  it('registers at most one bridge listener per event type when waits resolve', async () => {
    // The SDK must register one persistent dispatcher per event type, not one
    // bridge listener per wait (removeEventListener is a no-op across the bridge).
    for (let i = 0; i < 25; i += 1) {
      const durationWait = player.nativeEvent('mediaduration');
      const stateWait = player.mediaStateChange('active');

      bridge.emit('mediaduration', { target: i });
      bridge.emit('mediastate', { target: 'active' });

      await Promise.all([durationWait, stateWait]);
    }

    expect(bridge.listenerCount('mediaduration')).to.equal(
      baselineMediaduration + 1,
    );
    expect(bridge.listenerCount('mediastate')).to.equal(baselineMediastate + 1);
  });

  it('does not accumulate bridge listeners across repeated waits and resets', async () => {
    // Repeated transitions where the native events never arrive and reset()
    // flushes the pending waits. The bridge listener count must stay bounded.
    for (let i = 0; i < 25; i += 1) {
      const durationWait = player.nativeEvent('mediaduration');
      const stateWait = player.mediaStateChange('active');

      await player.reset();

      const results = await Promise.allSettled([durationWait, stateWait]);

      expect(results.every(result => result.status === 'rejected')).to.equal(
        true,
      );
    }

    expect(bridge.listenerCount('mediaduration')).to.equal(
      baselineMediaduration + 1,
    );
    expect(bridge.listenerCount('mediastate')).to.equal(baselineMediastate + 1);
  });

  it('leaves waits created after a reset untouched', async () => {
    const staleWait = player.nativeEvent('mediaduration');

    await player.reset();

    const freshWait = player.nativeEvent('mediaduration');

    expect((await Promise.allSettled([staleWait]))[0]?.status).to.equal(
      'rejected',
    );

    bridge.emit('mediaduration', { target: 42 });

    const freshResult = await freshWait;

    expect((freshResult as unknown as { target: number }).target).to.equal(42);
  });

  it('load() swallows the cancellation when a reset interrupts its duration wait', async () => {
    const transitions: Array<Event> = [];
    const onTransition = (event: Event) => transitions.push(event);

    events.addEventListener('media-product-transition', onTransition);

    const payload = {
      assetPosition: 0,
      mediaProduct: {},
      playbackInfo: {},
      streamInfo: {
        expires: 3600000,
        id: 'stream-1',
        prefetched: false,
        quality: 'LOSSLESS',
        securityToken: 'token',
        streamFormat: 'flac',
        streamUrl: 'https://example.com/stream',
        streamingSessionId: 'session-1',
        type: 'track',
      },
    } as unknown as LoadPayload;

    try {
      const loadPromise = player.load(payload, 'implicit');

      // Let load() get past its initial reset() and register the mediaduration
      // wait before we interrupt it (the native event never arrives).
      await new Promise(resolve => {
        setTimeout(resolve);
      });

      await player.reset();

      // load() must resolve rather than surface the cancellation as an
      // unhandled rejection...
      await loadPromise;

      // ...and must not dispatch a transition for the abandoned media product.
      expect(transitions).to.have.length(0);
    } finally {
      events.removeEventListener('media-product-transition', onTransition);
    }
  });
});
