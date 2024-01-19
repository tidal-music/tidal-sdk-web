/**
 * Get the available output devices.
 *
 * @returns { Set<OutputDevice>}
 */
export async function getOutputDevices() {
  const { outputDevices } = await import('../../internal/output-devices');

  return [...outputDevices.outputDevices];
}
