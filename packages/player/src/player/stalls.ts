import type { MediaProductTransition } from '../api/event/media-product-transition';
import { events } from '../event-bus';
import type { Stall } from '../internal/event-tracking/streaming-metrics/playback-statistics';
import * as StreamingMetrics from '../internal/event-tracking/streaming-metrics/playback-statistics';
import { trueTime } from '../internal/true-time';

const state = {
  isPlaying: false,
  isSeeking: false,
};

const waitingEvent: (mediaEl: HTMLMediaElement) => Promise<void> = mediaEl =>
  new Promise(resolve =>
    mediaEl.addEventListener('waiting', () => resolve(), { once: true }),
  );

const playingEvent: (mediaEl: HTMLMediaElement) => Promise<void> = mediaEl =>
  new Promise(resolve =>
    mediaEl.addEventListener('playing', () => resolve(), { once: true }),
  );

function handleSeekingEvent() {
  state.isSeeking = true;
}

function handleSeekedEvent() {
  state.isSeeking = false;
}

function handlePausedEvent() {
  state.isPlaying = false;
}

async function handlePlayingEvent(
  mediaEl: HTMLMediaElement,
  streamingSessionId: string,
) {
  state.isPlaying = true;

  await waitingEvent(mediaEl);

  const assetPosition = mediaEl.currentTime;

  if (!state.isPlaying || assetPosition === 0) {
    return;
  }

  const startTimestamp = trueTime.now();
  const reason = state.isSeeking ? 'SEEK' : 'UNEXPECTED';

  await playingEvent(mediaEl);

  const endTimestamp = trueTime.now();

  const stall: Stall = {
    assetPosition,
    endTimestamp,
    reason,
    startTimestamp,
  };

  StreamingMetrics.playbackStatistics({
    stalls: [stall],
    streamingSessionId,
  });
}

export function registerStalls(mediaEl: HTMLMediaElement) {
  let currentStreamingSessionId: null | string;

  events.addEventListener('media-product-transition', e => {
    if (e instanceof CustomEvent) {
      const data = (e as MediaProductTransition).detail;

      currentStreamingSessionId = data.playbackContext.playbackSessionId;
    }
  });

  const onPaused = () => handlePausedEvent();
  const onPlaying = () => {
    if (currentStreamingSessionId) {
      handlePlayingEvent(mediaEl, currentStreamingSessionId).catch(
        console.error,
      );
    }
  };
  const onSeeking = () => handleSeekingEvent();
  const onSeeked = () => handleSeekedEvent();

  mediaEl.addEventListener('seeking', onSeeking);
  mediaEl.addEventListener('seeked', onSeeked);
  mediaEl.addEventListener('playing', onPlaying);
  mediaEl.addEventListener('paused', onPaused);

  return function unregister() {
    mediaEl.removeEventListener('seeking', onSeeking);
    mediaEl.removeEventListener('seeked', onSeeked);
    mediaEl.removeEventListener('playing', onPlaying);
    mediaEl.removeEventListener('paused', onPaused);
  };
}
