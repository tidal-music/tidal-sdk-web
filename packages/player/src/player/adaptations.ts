import type shaka from 'shaka-player';

import * as StreamingMetrics from '../internal/event-tracking/streaming-metrics/index.js';
import type { Adaptation } from '../internal/event-tracking/streaming-metrics/playback-statistics.js';
import { updatePlaybackQuality } from '../internal/helpers/update-playback-quality.js';
import { trueTime } from '../internal/true-time.js';

export function shakaTrackToAdaptation(
  shakaTrack: shaka.extern.Track,
  assetPosition: number,
): Adaptation {
  const timestamp = trueTime.now();
  const mimeType = shakaTrack.mimeType;
  const codecs = shakaTrack.codecs;
  const bandwidth = shakaTrack.bandwidth;
  const videoWidth = shakaTrack.width;
  const videoHeight = shakaTrack.height;

  return {
    assetPosition,
    bandwidth,
    codecs,
    mimeType,
    timestamp,
    videoHeight,
    videoWidth,
  };
}

export async function saveAdaptation(
  streamingSessionId: string,
  activeTrack: shaka.extern.Track,
  currentTime: number,
): Promise<Adaptation> {
  const adaptation = shakaTrackToAdaptation(activeTrack, currentTime);

  if (adaptation.mimeType && adaptation.codecs) {
    await StreamingMetrics.playbackStatistics({
      adaptations: [adaptation],
      streamingSessionId,
    });
  }

  return adaptation;
}

export function registerAdaptations(
  shakaPlayer: shaka.Player,
  getOwnSessionId: () => string | undefined,
  isActivePlayer: () => boolean,
) {
  const onManualOrAutomaticQualityChange = () => {
    if (!isActivePlayer()) {
      return;
    }

    const activeTrack: shaka.extern.Track = shakaPlayer
      .getVariantTracks()
      .find(v => v.active)!;

    const mediaElement = shakaPlayer.getMediaElement();
    const sessionId = getOwnSessionId();

    if (sessionId && mediaElement) {
      saveAdaptation(sessionId, activeTrack, mediaElement.currentTime).catch(
        console.error,
      );
    }
  };

  const onAutomaticQualityChange = (ev: Event) => {
    if (!isActivePlayer()) {
      return;
    }

    // onManualOrAutomaticQualityChange() also guards on isActivePlayer()
    // for its 'variantchanged' caller, so it's safe to call here without
    // a second guard -- the redundant call would otherwise re-check the
    // same state we just confirmed.
    onManualOrAutomaticQualityChange();

    // Shaka uses FakeEvent which sets properties directly on the event, not in detail
    const shakaTrack = (ev as Event & { newTrack: shaka.extern.Track })
      .newTrack;
    const sessionId = getOwnSessionId();

    if (sessionId) {
      updatePlaybackQuality(sessionId, shakaTrack);
    }
  };

  shakaPlayer.addEventListener('adaptation', onAutomaticQualityChange);

  // TODO: if we allow manual adaptation switches, we should check if `playbackContext`
  // will be updated correctly, or if we should update it here.
  shakaPlayer.addEventListener(
    'variantchanged',
    onManualOrAutomaticQualityChange,
  );

  return function unregister() {
    shakaPlayer.removeEventListener('adaptation', onAutomaticQualityChange);
    shakaPlayer.removeEventListener(
      'variantchanged',
      onManualOrAutomaticQualityChange,
    );
  };
}
