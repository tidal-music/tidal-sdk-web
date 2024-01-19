import * as ActiveDevicePassThroughChanged from '../../api/event/active-device-pass-through-changed';
import { events } from '../../event-bus';
import { on } from '../helpers/on';

/**
 * Set pass through to enabled or not. Only available for native player.
 *
 * @param {boolean} passThrough - The desired mode.
 * @returns {Promise<boolean>} - The mode we now use.
 */
export async function setOutputDevicePassThrough(
  passThrough: boolean,
): Promise<boolean> {
  const { outputDevices } = await import('../output-devices');

  const upcomingEvent = on(events, ActiveDevicePassThroughChanged.eventName);

  outputDevices.passThrough = passThrough;

  const event = await upcomingEvent;

  if (event instanceof CustomEvent) {
    if (event.detail === passThrough) {
      return passThrough;
    }
  }

  // Note: Native player will emit some error than we handle.
  throw new Error('Could not set pass through.');
}
