import type shaka from 'shaka-player';

import { playbackQualityChanged } from '../../api/event/playback-quality-changed';
import type { AudioQuality } from '../../api/interfaces';
import { events } from '../../event-bus';
import type { NativePlayerStreamFormat } from '../../player/nativeInterface';

import { streamFormatToCodec } from './manifest-parser';
import { streamingSessionStore } from './streaming-session-store';

/**
 * Infer the audio quality from a Shaka track.
 *
 * @param shakaTrack - The Shaka track to infer the audio quality from.
 * @returns The audio quality.
 */
export function shakaTrackToAudioQuality(
  shakaTrack: shaka.extern.Track,
): AudioQuality {
  const audioCodec = shakaTrack.audioCodec;

  if (audioCodec === 'flac') {
    if (
      (shakaTrack.audioSamplingRate && shakaTrack.audioSamplingRate > 44100) ||
      (shakaTrack.originalAudioId &&
        idToBitDepth(shakaTrack.originalAudioId)! > 16)
    ) {
      return 'HI_RES_LOSSLESS';
    }
    return 'LOSSLESS';
  }
  if (audioCodec === 'mp4a.40.2') {
    return 'HIGH';
  }

  return 'LOW';
}

/**
 * Find bit depth from a id attribute, e.g. id="FLAC,44100,16")
 * Should return `undefined` for cases like: `HEAACV1`.
 */
export function idToBitDepth(id: string): number | undefined {
  // Only extract bit depth from comma-separated formats like "FLAC,44100,16"
  if (!id?.includes(',')) {
    return undefined;
  }
  const numbers = id.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    return Number(numbers[numbers.length - 1]);
  }
}

/**
 * Update the (audio) playback quality based on the active Shaka track.
 *
 * @param currentStreamingSessionId - The current streaming session ID.
 * @param activeShakaTrack - The active Shaka track.
 */
export function updatePlaybackQuality(
  currentStreamingSessionId: string | undefined,
  activeShakaTrack: shaka.extern.Track | undefined,
) {
  if (currentStreamingSessionId && activeShakaTrack?.audioCodec) {
    const mediaProductTransition =
      streamingSessionStore.getMediaProductTransition(
        currentStreamingSessionId,
      );

    if (!mediaProductTransition) {
      console.warn('No media product transition saved.');
      return;
    }

    const { mediaProduct, playbackContext } = mediaProductTransition;

    const updatedPlaybackContext = {
      ...playbackContext,
      actualAudioQuality: shakaTrackToAudioQuality(activeShakaTrack),
      bandwidth: activeShakaTrack.bandwidth, // TODO: add to spec?
      bitDepth: activeShakaTrack.originalAudioId
        ? (idToBitDepth(activeShakaTrack.originalAudioId) ?? null)
        : null,
      codec: activeShakaTrack.audioCodec
        ? (streamFormatToCodec(
            activeShakaTrack.audioCodec as NativePlayerStreamFormat,
          ) ?? null)
        : null,
      sampleRate: activeShakaTrack.audioSamplingRate,
    };

    streamingSessionStore.saveMediaProductTransition(
      currentStreamingSessionId,
      {
        mediaProduct,
        playbackContext: updatedPlaybackContext,
      },
    );

    events.dispatchEvent(playbackQualityChanged(updatedPlaybackContext));
  }
}
