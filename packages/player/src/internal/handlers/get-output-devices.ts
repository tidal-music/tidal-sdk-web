import type { OutputDevice } from '../../internal/output-devices';

/**
 * Get the available output devices.
 *
 * @returns {Array<OutputDevice>}
 */
export async function getOutputDevices(): Promise<Array<OutputDevice>> {
  const { outputDevices } = await import('../../internal/output-devices');

  return [...outputDevices.outputDevices];
}
