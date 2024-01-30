import { expect } from 'chai';

import * as Player from '../../index';
import { OutputDevice } from '../../internal/output-devices';
import { credentialsProvider } from '../../test-helpers';

import { deviceChange } from './device-change';

Player.setCredentialsProvider(credentialsProvider);

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
