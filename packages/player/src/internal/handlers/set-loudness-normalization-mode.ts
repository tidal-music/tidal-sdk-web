import type { LoudnessNormalizationMode } from '../../api/interfaces.js';
import * as Config from '../../config.js';
import { playerState } from '../../player/state.js';

/**
 * Set loudness normalization mode.
 *
 * @param {LoudnessNormalizationMode} mode
 */
export function setLoudnessNormalizationMode(mode: LoudnessNormalizationMode) {
  Config.update({
    loudnessNormalizationMode: mode,
  });

  playerState.activePlayer?.updateVolumeLevel();
}
