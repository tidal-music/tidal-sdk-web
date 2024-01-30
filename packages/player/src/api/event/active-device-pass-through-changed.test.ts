import { expect } from 'chai';

import {
  activeDevicePassThroughChanged,
  eventName,
} from './active-device-pass-through-changed';

describe('activeDeviceDisconnected', () => {
  it('creates a CustomEvent with a predetermined name and passthrough state as boolean in detail', () => {
    const result = activeDevicePassThroughChanged(true);

    expect(result instanceof CustomEvent).to.equal(true);
    expect(result.type).to.equal(eventName);
    expect(result.detail).to.equal(true);
  });
});
