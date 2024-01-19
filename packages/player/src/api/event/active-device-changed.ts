export type ActiveDeviceChanged = CustomEvent<string>;
export const eventName = 'active-device-changed';

export function activeDeviceChanged(id: string): ActiveDeviceChanged {
  return new CustomEvent<string>(eventName, {
    detail: id,
  });
}
