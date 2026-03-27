import * as Config from '../../config';

const MIN_CROSSFADE_MS = -5000;
const MAX_CROSSFADE_MS = 15000;

/**
 * Set the track transition mode via a single numeric value:
 *  - Positive: crossfade overlap in ms (e.g. 5000 = 5s crossfade)
 *  - Zero: gapless (default)
 *  - Negative: silence gap in ms (e.g. -2000 = 2s gap between tracks)
 *
 * Clamped to the range -5000..15000.
 *
 * @param {number} crossfadeInMs
 */
export function setTransitionMode(crossfadeInMs: number) {
  Config.update({
    crossfadeInMs: Math.max(
      MIN_CROSSFADE_MS,
      Math.min(MAX_CROSSFADE_MS, Math.round(crossfadeInMs)),
    ),
  });
}
