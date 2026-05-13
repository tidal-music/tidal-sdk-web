import { eventName } from '../../api/event/active-device-mode-changed.js';
import { events } from '../../event-bus.js';
import type { NativePlayerDeviceMode } from '../../player/nativeInterface.js';
import { on } from '../helpers/on.js';

/**
 * Set device mode. Only available for native player.
 *
 * @param {NativePlayerDeviceMode} mode - The desired mode.
 * @returns {Promise<NativePlayerDeviceMode>} - The mode we now use.
 */
export async function setOutputDeviceMode(
  mode: NativePlayerDeviceMode = 'shared',
): Promise<NativePlayerDeviceMode> {
  const { outputDevices } = await import('../output-devices.js');

  const upcomingEvent = on(events, eventName);

  outputDevices.deviceMode = mode;

  const event = await upcomingEvent;

  if (event instanceof CustomEvent) {
    if (event.detail === mode) {
      return mode;
    }
  }

  // Note: Native player will emit some error than we handle.
  throw new Error('Could not set new device mode.');
}
