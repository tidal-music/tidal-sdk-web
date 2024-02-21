// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import {
  activeDeviceModeChanged,
  eventName,
} from './active-device-mode-changed';

describe('activeDeviceDisconnected', () => {
  it('creates a CustomEvent with a predetermined name and device mode as detail', () => {
    const result = activeDeviceModeChanged('exclusive');

    expect(result instanceof CustomEvent).toEqual(true);
    expect(result.type).toEqual(eventName);
    expect(result.detail).toEqual('exclusive');
  });
});
