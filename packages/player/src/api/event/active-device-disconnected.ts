export const eventName = 'active-device-disconnected';

/**
 * Native player device disconnect event.
 */
export function activeDeviceDisconnected(): CustomEvent {
  return new CustomEvent(eventName);
}
