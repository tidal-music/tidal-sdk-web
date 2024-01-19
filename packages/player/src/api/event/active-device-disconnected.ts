export const eventName = 'active-device-disconnected';

/**
 * Native player device disconnect event.
 */
export function activeDeviceDisconnected() {
  return new CustomEvent(eventName);
}
