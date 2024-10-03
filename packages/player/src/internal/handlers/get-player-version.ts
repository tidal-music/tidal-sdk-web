/**
 * Get the module version of the Player SDK.
 */
export function getPlayerVersion(): string {
  return import.meta.env.PACKAGE_VERSION;
}
