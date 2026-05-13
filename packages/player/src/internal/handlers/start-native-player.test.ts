import { expect } from 'chai';

import NativePlayer from '../../player/nativePlayer.js';
import { playerState } from '../../player/state.js';
import { mockNativePlayer } from '../../test-helpers.js';

import { startNativePlayer } from './start-native-player.js';

describe('startNativePlayer', () => {
  it('Sets native player as active player', async () => {
    mockNativePlayer();

    await startNativePlayer();

    expect(playerState.activePlayer).to.be.instanceOf(NativePlayer);
  });
});
