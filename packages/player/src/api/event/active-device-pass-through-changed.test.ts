// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import {
  activeDevicePassThroughChanged,
  eventName,
} from './active-device-pass-through-changed';

describe('activeDeviceDisconnected', () => {
  it('creates a CustomEvent with a predetermined name and passthrough state as boolean in detail', () => {
    const result = activeDevicePassThroughChanged(true);

    expect(result instanceof CustomEvent).toEqual(true);
    expect(result.type).toEqual(eventName);
    expect(result.detail).toEqual(true);
  });
});
