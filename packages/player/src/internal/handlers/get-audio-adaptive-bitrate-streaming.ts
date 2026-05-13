import * as Config from '../../config.js';

/**
 * Get the current adaptive bitrate streaming setting for audio.
 *
 * @returns {boolean} Whether adaptive bitrate streaming is enabled for audio.
 */
export function getAudioAdaptiveBitrateStreaming(): boolean {
  return Config.get('audioAdaptiveBitrateStreaming');
}
