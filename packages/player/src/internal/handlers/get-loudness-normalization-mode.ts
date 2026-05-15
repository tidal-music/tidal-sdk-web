import type { LoudnessNormalizationMode } from '../../api/interfaces.js';
import * as Config from '../../config.js';

/**
 * Get the value for loudness normalization.
 *
 * @returns {LoudnessNormalizationMode}
 */
export function getLoudnessNormalizationMode(): LoudnessNormalizationMode {
  return Config.get('loudnessNormalizationMode');
}
