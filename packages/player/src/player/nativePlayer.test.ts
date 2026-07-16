import { expect } from 'chai';

import NativePlayer, { EventWaitCancelledError } from './nativePlayer.js';

type Listener = (...args: Array<unknown>) => void;

/**
 * Stand-in for the native player bridge
 * (window.NativePlayerComponent.Player()).
 *
 * Critically, it models Electron's contextBridge semantics: a function passed
 * across the isolated-world boundary does NOT keep its identity, so the bridge
 * can never find the wrapper it created for an earlier addEventListener when
 * removeEventListener is later called with the "same" function. We reproduce
 * that by making removeEventListener a no-op. A correct SDK must therefore not
 * rely on removeEventListener to bound its listener count — which is exactly
 * the leak these tests guard against.
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

  // No-op on purpose: see the class comment. The contextBridge cannot match
  // the listener, so removal never happens across the real bridge.
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
  // Listeners registered by the NativePlayer constructor itself
  // (registerEventListeners); the waits under test add at most one dispatcher
  // per event type on top of these.
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
    // Even though removeEventListener is a no-op across the contextBridge, the
    // SDK must not add a bridge listener per wait. It registers a single
    // persistent dispatcher per event type and routes each transient waiter
    // through a JS-side collection instead.
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
    // Simulates repeated track transitions while the native player never
    // answers (e.g. after the player process crashed): every load awaits
    // mediaduration/mediastate events that never arrive, and reset() flushes
    // them. The bridge listener count must stay bounded regardless.
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
});
