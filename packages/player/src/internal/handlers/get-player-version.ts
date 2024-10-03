/**
 * Get the module version of the Player SDK.
 */
export function getPlayerVersion(): string {
  return import.meta.env.VITE_PLAYER_VERSION;
}
