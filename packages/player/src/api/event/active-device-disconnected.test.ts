// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import {
  activeDeviceDisconnected,
  eventName,
} from './active-device-disconnected';

describe('activeDeviceDisconnected', () => {
  it('creates a CustomEvent with a predetermined name', () => {
    const result = activeDeviceDisconnected();

    expect(result instanceof CustomEvent).toEqual(true);
    expect(result.type).toEqual(eventName);
  });
});
