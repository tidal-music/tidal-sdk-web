import { expect } from 'chai';

import { mimeTypes } from '../internal/constants';

import { mountVideoElements } from './audio-context-store';

import {
  getAppropriatePlayer,
  resetAllPlayers,
  setPlayerConfig,
} from './index';

// Mock native player component for tests
class NativePlayerMock extends EventTarget {
  listDevices() {
    // Mock implementation
  }

  load() {
    this.dispatchEvent(new Event('mediaduration'));
    this.dispatchEvent(new Event('mediastate'));
  }

  play() {
    // Mock implementation
  }

  setVolume() {
    // Mock implementation
  }

  stop() {
    // Mock implementation
  }
}

function mockNativePlayer() {
  // @ts-expect-error - Mocking window.NativePlayerComponent for tests
  window.NativePlayerComponent = {
    Player: () => new NativePlayerMock(),
  };
}

describe('getAppropriatePlayer', () => {
  before(async () => {
    // Mock native player for all tests
    mockNativePlayer();
    // Setup player root and video elements
    await mountVideoElements();
  });

  beforeEach(async () => {
    // Reset players before each test
    await resetAllPlayers();
  });

  it('falls back to shaka player when mimeType is DASH and native player is configured', async () => {
    // Configure player config with native player for LOSSLESS quality
    setPlayerConfig([
      {
        itemTypes: ['track'],
        player: 'native',
        qualities: ['LOSSLESS', 'HI_RES_LOSSLESS'],
      },
      {
        itemTypes: ['track'],
        player: 'shaka',
        qualities: ['LOW', 'HIGH'],
      },
    ]);

    // Call getAppropriatePlayer with DASH mimeType (which can contain FLAC)
    const player = await getAppropriatePlayer(
      'track',
      'LOSSLESS',
      mimeTypes.DASH,
    );

    // Should return shaka player, not native player (native doesn't support DASH well)
    expect(player.name).to.equal('shakaPlayer');
  });

  it('uses native player when mimeType is BTS', async () => {
    // Configure player config with native player for HIGH quality
    setPlayerConfig([
      {
        itemTypes: ['track'],
        player: 'native',
        qualities: ['HIGH'],
      },
      {
        itemTypes: ['track'],
        player: 'shaka',
        qualities: ['LOW'],
      },
    ]);

    // Call getAppropriatePlayer with BTS mimeType (non-DASH format)
    const player = await getAppropriatePlayer('track', 'HIGH', mimeTypes.BTS);

    // Should return native player since BTS is supported
    expect(player.name).to.equal('nativePlayer');
  });

  it('uses shaka player when mimeType is DASH and shaka is already configured', async () => {
    // Configure player config with shaka player for LOSSLESS quality
    setPlayerConfig([
      {
        itemTypes: ['track'],
        player: 'shaka',
        qualities: ['LOSSLESS', 'HI_RES_LOSSLESS'],
      },
    ]);

    // Call getAppropriatePlayer with DASH mimeType
    const player = await getAppropriatePlayer(
      'track',
      'LOSSLESS',
      mimeTypes.DASH,
    );

    // Should return shaka player
    expect(player.name).to.equal('shakaPlayer');
  });

  it('uses native player when mimeType is EMU', async () => {
    // Configure player config with native player
    setPlayerConfig([
      {
        itemTypes: ['track'],
        player: 'native',
        qualities: ['HIGH'],
      },
    ]);

    // Call getAppropriatePlayer with EMU mimeType
    const player = await getAppropriatePlayer('track', 'HIGH', mimeTypes.EMU);

    // Should return native player since EMU is supported
    expect(player.name).to.equal('nativePlayer');
  });

  it('uses native player when mimeType is HLS', async () => {
    // Configure player config with native player
    setPlayerConfig([
      {
        itemTypes: ['track'],
        player: 'native',
        qualities: ['HIGH'],
      },
    ]);

    // Call getAppropriatePlayer with HLS mimeType
    const player = await getAppropriatePlayer('track', 'HIGH', mimeTypes.HLS);

    // Should return native player since HLS is supported
    expect(player.name).to.equal('nativePlayer');
  });
});
