export type ActiveDevicePassThroughChanged = CustomEvent<boolean>;

export const eventName = 'active-device-pass-through-changed';

export function activeDevicePassThroughChanged(
  passThrough: boolean,
): ActiveDevicePassThroughChanged {
  return new CustomEvent<boolean>(eventName, {
    detail: passThrough,
  });
}
