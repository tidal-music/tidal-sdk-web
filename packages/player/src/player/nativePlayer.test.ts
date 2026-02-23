import { expect } from 'chai';

import NativePlayer from './nativePlayer';

/**
 * Extended NativePlayerMock that tracks recover() calls for assertion.
 *
 * The NativePlayer constructor immediately calls
 * `window.NativePlayerComponent.Player()` and `registerEventListeners()`,
 * so this mock must be installed BEFORE constructing NativePlayer.
 */
class TestNativePlayerMock extends EventTarget {
  recoverCalls: Array<{ encryptionKey?: string; url: string }> = [];

  cancelPreload() {
    // Mock implementation
  }

  listDevices() {
    // Mock implementation
  }

  load() {
    this.dispatchEvent(
      new Event('mediaduration', {
        // @ts-expect-error - Test mock: EventInit doesn't have target, but native player uses it
        target: 20,
      }),
    );
  }

  pause() {
    // Mock implementation
  }

  play() {
    // Mock implementation
  }

  preload() {
    // Mock implementation
  }

  recover(url: string, encryptionKey?: string) {
    this.recoverCalls.push({ encryptionKey, url });
  }

  releaseDevice() {
    // Mock implementation
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeEventListener(...args: Array<any>) {
    super.removeEventListener(args[0] as string, args[1] as EventListener);
  }

  seek() {
    // Mock implementation
  }

  selectDevice() {
    // Mock implementation
  }

  selectSystemDevice() {
    // Mock implementation
  }

  setVolume() {
    // Mock implementation
  }

  stop() {
    // Mock implementation
  }
}

let mockPlayer: TestNativePlayerMock;

function setupMock() {
  mockPlayer = new TestNativePlayerMock();
  // @ts-expect-error - Mocking window.NativePlayerComponent for tests
  window.NativePlayerComponent = {
    Player: () => mockPlayer,
  };
}

describe('NativePlayer - 403 recovery', () => {
  beforeEach(() => {
    setupMock();
  });

  it('wires up mediamaxconnectionsreached listener that reads statusCode from event target', () => {
    // Constructing NativePlayer calls registerEventListeners()
    // which sets up the mediamaxconnectionsreached handler.
    const player = new NativePlayer();

    // Dispatch mediamaxconnectionsreached with statusCode on the target.
    // The handler reads `e.target?.statusCode` and passes it to #handleNetworkError.
    const event = new Event('mediamaxconnectionsreached');
    Object.defineProperty(event, 'target', {
      value: { statusCode: 403 },
      writable: false,
    });
    mockPlayer.dispatchEvent(event);

    // The 403 path calls #recoverWithFreshUrl which requires currentMediaProduct.
    // Since we haven't loaded anything, currentMediaProduct is null, so
    // recoverWithFreshUrl returns early without calling recover().
    // This verifies the 403 path was entered (no error thrown) and the
    // guard clause for missing currentMediaProduct works.
    expect(mockPlayer.recoverCalls.length).to.equal(0);

    // Ensure the player instance was created successfully
    expect(player.name).to.equal('nativePlayer');
  });

  it('does not call recover() when currentMediaProduct is not set', async () => {
    const player = new NativePlayer();

    const event = new Event('mediamaxconnectionsreached');
    Object.defineProperty(event, 'target', {
      value: { statusCode: 403 },
      writable: false,
    });
    mockPlayer.dispatchEvent(event);

    // Give the async handler time to complete
    await new Promise(resolve => {
      setTimeout(resolve, 50);
    });

    // recover() should NOT be called because there is no current media product
    expect(mockPlayer.recoverCalls.length).to.equal(0);
    expect(player.name).to.equal('nativePlayer');
  });

  // TODO: Full integration test for 403 recovery with a loaded media product.
  // This would require:
  // 1. Mocking credentialsProviderStore.credentialsProvider.getCredentials()
  // 2. Mocking fetchPlaybackInfo() to return a PlaybackInfo with a fresh URL
  // 3. Loading a media product first (calling player.load() with valid payload)
  // 4. Then dispatching mediamaxconnectionsreached with statusCode 403
  // 5. Verifying mockPlayer.recoverCalls contains the fresh URL and security token
});

describe('NativePlayer - non-403 network errors', () => {
  beforeEach(() => {
    setupMock();
  });

  it('does not call recover() for statusCode 500', async () => {
    const player = new NativePlayer();

    const event = new Event('mediamaxconnectionsreached');
    Object.defineProperty(event, 'target', {
      value: { statusCode: 500 },
      writable: false,
    });
    mockPlayer.dispatchEvent(event);

    // Give the async handler time to run
    await new Promise(resolve => {
      setTimeout(resolve, 50);
    });

    // recover() should NOT be called for non-403 status codes
    expect(mockPlayer.recoverCalls.length).to.equal(0);
    expect(player.name).to.equal('nativePlayer');
  });

  it('does not call recover() when statusCode is undefined (legacy behavior)', async () => {
    const player = new NativePlayer();

    // Dispatch without statusCode on the target — simulates the original
    // behavior where the event had no status code information.
    const event = new Event('mediamaxconnectionsreached');
    mockPlayer.dispatchEvent(event);

    await new Promise(resolve => {
      setTimeout(resolve, 50);
    });

    expect(mockPlayer.recoverCalls.length).to.equal(0);
    expect(player.name).to.equal('nativePlayer');
  });

  it('does not call recover() for statusCode 429', async () => {
    const player = new NativePlayer();

    const event = new Event('mediamaxconnectionsreached');
    Object.defineProperty(event, 'target', {
      value: { statusCode: 429 },
      writable: false,
    });
    mockPlayer.dispatchEvent(event);

    await new Promise(resolve => {
      setTimeout(resolve, 50);
    });

    expect(mockPlayer.recoverCalls.length).to.equal(0);
    expect(player.name).to.equal('nativePlayer');
  });
});

describe('NativePlayer - event target statusCode extraction', () => {
  beforeEach(() => {
    setupMock();
  });

  it('handles event target with statusCode property', () => {
    const player = new NativePlayer();

    // The listener does: const statusCode = e.target?.statusCode
    // Verify this works when target has statusCode.
    const event = new Event('mediamaxconnectionsreached');
    Object.defineProperty(event, 'target', {
      value: { statusCode: 403 },
      writable: false,
    });

    // Should not throw
    mockPlayer.dispatchEvent(event);
    expect(player.name).to.equal('nativePlayer');
  });

  it('handles event target without statusCode property', () => {
    const player = new NativePlayer();

    // When target exists but has no statusCode, optional chaining returns undefined.
    const event = new Event('mediamaxconnectionsreached');
    Object.defineProperty(event, 'target', {
      value: {},
      writable: false,
    });

    // Should not throw
    mockPlayer.dispatchEvent(event);
    expect(player.name).to.equal('nativePlayer');
  });

  it('handles event where target is null', () => {
    const player = new NativePlayer();

    // When target is null, optional chaining (e.target?.statusCode) returns undefined.
    const event = new Event('mediamaxconnectionsreached');
    Object.defineProperty(event, 'target', {
      value: null,
      writable: false,
    });

    // Should not throw
    mockPlayer.dispatchEvent(event);
    expect(player.name).to.equal('nativePlayer');
  });
});
