import * as Config from '../../config';
import type { AudioQuality } from '../../internal/types';

/**
 * Set the AudioQuality to use when streaming over WiFi.
 *
 * @param {AudioQuality} streamingWifiAudioQuality
 */
export function setStreamingWifiAudioQuality(
  streamingWifiAudioQuality: AudioQuality,
): void {
  Config.update({
    streamingWifiAudioQuality,
  });
}
