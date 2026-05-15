import type { OutputDevice } from '../../internal/output-devices.js';

type DeviceChangePayload = {
  devices: Array<OutputDevice>;
};

export type DeviceChange = CustomEvent<DeviceChangePayload>;

export function deviceChange(devices: Array<OutputDevice>): DeviceChange {
  return new CustomEvent<DeviceChangePayload>('device-change', {
    detail: {
      devices,
    },
  });
}
