import { expect } from 'chai';

import {
  activeDeviceDisconnected,
  eventName,
} from './active-device-disconnected';

describe('activeDeviceDisconnected', () => {
  it('creates a CustomEvent with a predetermined name', () => {
    const result = activeDeviceDisconnected();

    expect(result instanceof CustomEvent).to.equal(true);
    expect(result.type).to.equal(eventName);
  });
});
