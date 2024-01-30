import { expect } from 'chai';

import { activeDeviceChanged, eventName } from './active-device-changed';

describe('activeDeviceChanged', () => {
  it('creates a CustomEvent with a predetermined name with id as detail', () => {
    const result = activeDeviceChanged('cool-output-device');

    expect(result instanceof CustomEvent).to.equal(true);
    expect(result.type).to.equal(eventName);
    expect(result.detail).to.equal('cool-output-device');
  });
});
