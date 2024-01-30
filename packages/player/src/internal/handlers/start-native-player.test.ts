import { expect } from 'chai';

import NativePlayer from '../../player/nativePlayer';
import { playerState } from '../../player/state';
import { mockNativePlayer } from '../../test-helpers';

import { startNativePlayer } from './start-native-player';

describe('startNativePlayer', () => {
  it('Sets native player as active player', async () => {
    mockNativePlayer();

    await startNativePlayer();

    expect(playerState.activePlayer).to.be.instanceOf(NativePlayer);
  });
});
