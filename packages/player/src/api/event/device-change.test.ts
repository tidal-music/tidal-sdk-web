import { expect } from 'chai';

import * as Player from '../../index.js';
import { OutputDevice } from '../../internal/output-devices.js';
import { authAndEvents } from '../../test-helpers.js';

import { deviceChange } from './device-change.js';

beforeEach(async () => {
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

describe('deviceChange', () => {
  authAndEvents(before, after);

  it('creates a CustomEvent with a predetermined name', () => {
    const device = new OutputDevice({
      controllableVolume: true,
      name: 'Speakers in MacBook',
      nativeDeviceId: '7331',
      type: 'builtIn',
      webDeviceId: '1337',
    });
    const result = deviceChange([device]);

    expect(result instanceof CustomEvent).to.equal(true);
    expect(result.type).to.equal('device-change');

    result.detail.devices.forEach(_device => {
      expect(_device instanceof OutputDevice).to.equal(true);
    });
  });
});
