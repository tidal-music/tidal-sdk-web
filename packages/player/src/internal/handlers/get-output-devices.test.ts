import { expect } from '@esm-bundle/chai';

import * as Player from '../../index';
import { outputDevices } from '../../internal/output-devices';
import { credentialsProvider } from '../../test-helpers';
import { trueTime } from '../true-time';

import { getOutputDevices } from './get-output-devices';

describe('getOutputDevices', () => {
  beforeEach(async () => {
    await trueTime.synchronize();

    Player.setCredentialsProvider(credentialsProvider);

    // Output devices is reported by the player, thus need one to
    await Player.load(
      {
        productId: '141120674',
        productType: 'track',
        sourceId: 'tidal-player-tests',
        sourceType: 'tidal-player-tests',
      },
      0,
    );
  });

  it('returns the output devices from the OutputDevices class', async () => {
    const devices = await getOutputDevices();

    expect(devices).to.deep.equal([...outputDevices.outputDevices]);
  });
});
