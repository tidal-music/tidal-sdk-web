import * as Config from '../../config';

const MIN_CROSSFADE_MS = 0;
const MAX_CROSSFADE_MS = 15000;

/**
 * Set the track transition mode via a single numeric value:
 *  - Zero: gapless (default)
 *  - Positive: crossfade overlap in ms (e.g. 5000 = 5s crossfade)
 *
 * Clamped to the range 0..15000.
 *
 * @param {number} crossfadeInMs
 */
export function setTransitionMode(crossfadeInMs: number) {
  const sanitized = Number.isFinite(crossfadeInMs) ? crossfadeInMs : 0;

  Config.update({
    crossfadeInMs: Math.max(
      MIN_CROSSFADE_MS,
      Math.min(MAX_CROSSFADE_MS, Math.round(sanitized)),
    ),
  });
}
