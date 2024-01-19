import * as ActiveDeviceChanged from '../../api/event/active-device-changed';
import { events } from '../../event-bus';
import { on } from '../helpers/on';

/**
 * Set the output device. Applies to each sub-player that supports
 * output devices. Currently shaka and native.
 *
 * @param {string} sinkId - The sinkId we want to use as output.
 * @returns {Promise<string>} - The sinkId we are now using as output.
 */
export async function setOutputDevice(sinkId: string): Promise<string> {
  const { outputDevices } = await import('../output-devices');

  const upcomingEvent = on(events, ActiveDeviceChanged.eventName);

  const outputDevice = [...outputDevices.outputDevices].find(
    d => d.id === sinkId,
  );

  if (!outputDevice) {
    throw new ReferenceError('Output device does not exist: ' + sinkId);
  }

  outputDevices.activeDevice = outputDevice;

  const event = await upcomingEvent;

  if (event instanceof CustomEvent) {
    if (event.detail === sinkId) {
      return sinkId;
    }
  }

  // Note: Native player will emit some error than we handle.
  throw new Error('Could not set new device.');
}
