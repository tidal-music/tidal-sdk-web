import { expect } from 'chai';

import * as Player from '../../index.js';
import { outputDevices } from '../../internal/output-devices.js';
import { authAndEvents } from '../../test-helpers.js';

import { getOutputDevices } from './get-output-devices.js';

describe('getOutputDevices', () => {
  authAndEvents(before, after);

  beforeEach(async () => {
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
