import { expect } from 'chai';

import {
  activeDeviceModeChanged,
  eventName,
} from './active-device-mode-changed';

describe('activeDeviceDisconnected', () => {
  it('creates a CustomEvent with a predetermined name and device mode as detail', () => {
    const result = activeDeviceModeChanged('exclusive');

    expect(result instanceof CustomEvent).to.equal(true);
    expect(result.type).to.equal(eventName);
    expect(result.detail).to.equal('exclusive');
  });
});
