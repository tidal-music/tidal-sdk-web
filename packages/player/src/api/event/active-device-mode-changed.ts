import type { NativePlayerDeviceMode } from '../../player/nativeInterface.js';

export type ActiveDeviceModeChanged = CustomEvent<NativePlayerDeviceMode>;
export const eventName = 'active-device-mode-changed';

export function activeDeviceModeChanged(
  deviceMode: NativePlayerDeviceMode,
): ActiveDeviceModeChanged {
  return new CustomEvent<NativePlayerDeviceMode>(eventName, {
    detail: deviceMode,
  });
}
