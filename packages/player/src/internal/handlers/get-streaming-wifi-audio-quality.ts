import * as Config from '../../config.js';
import type { AudioQuality } from '../types.js';

/**
 * Get configured audio quality for streaming over WiFI.
 *
 * @returns {AudioQuality}
 */
export function getStreamingWifiAudioQuality(): AudioQuality {
  return Config.get('streamingWifiAudioQuality');
}
