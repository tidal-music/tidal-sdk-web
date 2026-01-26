import * as Config from '../../config';

/**
 * Enable or disable adaptive bitrate streaming for audio.
 * When enabled (default), the player will automatically adjust audio quality based on network conditions.
 * When disabled, the player will use a fixed quality based on the streamingWifiAudioQuality setting.
 * It takes effect on next media product load.
 *
 * Note: This setting only affects audio playback. Video always uses adaptive bitrate streaming.
 *
 * @param {boolean} enabled - Whether to enable adaptive bitrate streaming for audio.
 */
export function setAudioAdaptiveBitrateStreaming(enabled: boolean) {
  Config.update({
    audioAdaptiveBitrateStreaming: enabled,
  });
}
