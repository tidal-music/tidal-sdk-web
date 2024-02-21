// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import { activeDeviceChanged, eventName } from './active-device-changed';

describe('activeDeviceChanged', () => {
  it('creates a CustomEvent with a predetermined name with id as detail', () => {
    const result = activeDeviceChanged('cool-output-device');

    expect(result instanceof CustomEvent).toEqual(true);
    expect(result.type).toEqual(eventName);
    expect(result.detail).toEqual('cool-output-device');
  });
});
