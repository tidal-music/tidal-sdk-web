import { eventName } from '../../api/event/active-device-mode-changed';
import { events } from '../../event-bus';
import type { NativePlayerDeviceMode } from '../../player/nativeInterface';
import { on } from '../helpers/on';

/**
 * Set device mode. Only available for native player.
 *
 * @param {NativePlayerDeviceMode} mode - The desired mode.
 * @returns {Promise<NativePlayerDeviceMode>} - The mode we now use.
 */
export async function setOutputDeviceMode(
  mode: NativePlayerDeviceMode = 'shared',
): Promise<NativePlayerDeviceMode> {
  const { outputDevices } = await import('../output-devices');

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
