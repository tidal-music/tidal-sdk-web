import type { LoudnessNormalizationMode } from '../../api/interfaces';
import * as Config from '../../config';
import { playerState } from '../../player/state';

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
