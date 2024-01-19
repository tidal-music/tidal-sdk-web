import type { LoudnessNormalizationMode } from '../../api/interfaces';
import * as Config from '../../config';

/**
 * Get the value for loudness normalization.
 *
 * @returns {LoudnessNormalizationMode}
 */
export function getLoudnessNormalizationMode(): LoudnessNormalizationMode {
  return Config.get('loudnessNormalizationMode');
}
