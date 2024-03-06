import type shaka from 'shaka-player';

import type { MediaProductTransition } from '../api/event/media-product-transition';
import { events } from '../event-bus';
import * as StreamingMetrics from '../internal/event-tracking/streaming-metrics/index';
import type { Adaptation } from '../internal/event-tracking/streaming-metrics/playback-statistics';
import { trueTime } from '../internal/true-time';

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

export function registerAdaptations(shakaPlayer: shaka.Player) {
  let currentStreamingSessionId: null | string;

  const onAdaptation = () => {
    const activeTrack: shaka.extern.Track = shakaPlayer
      .getVariantTracks()
      .filter(v => v.active)[0]!;

    const mediaElement = shakaPlayer.getMediaElement();

    if (currentStreamingSessionId && mediaElement) {
      saveAdaptation(
        currentStreamingSessionId,
        activeTrack,
        mediaElement.currentTime,
      ).catch(console.error);
    }
  };

  shakaPlayer.addEventListener('adaptation', onAdaptation);
  shakaPlayer.addEventListener('variantchanged', onAdaptation);

  const onMediaProductTransition: EventListener = e => {
    if (e instanceof CustomEvent) {
      const data = (e as MediaProductTransition).detail;

      currentStreamingSessionId = data.playbackContext.playbackSessionId;
    }
  };

  events.addEventListener('media-product-transition', onMediaProductTransition);

  return function unregister() {
    shakaPlayer.removeEventListener('adaptation', onAdaptation);
    shakaPlayer.removeEventListener('variantchanged', onAdaptation);
    events.removeEventListener(
      'media-product-transition',
      onMediaProductTransition,
    );
  };
}
