import * as Config from '../../config';
import type { AudioQuality } from '../types';

/**
 * Get configured audio quality for streaming over WiFI.
 *
 * @returns {AudioQuality}
 */
export function getStreamingWifiAudioQuality(): AudioQuality {
  return Config.get('streamingWifiAudioQuality');
}
