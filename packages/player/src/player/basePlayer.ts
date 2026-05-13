import { type EndReason, type EndedEvent, ended } from '../api/event/ended.js';
import type { MediaProductTransitionPayload } from '../api/event/media-product-transition.js';
import { playbackStateChange } from '../api/event/playback-state-change.js';
import { preloadRequest } from '../api/event/preload-request.js';
import type { MediaProduct, PlaybackState } from '../api/interfaces.js';
import * as Config from '../config.js';
import { events } from '../event-bus.js';
import * as PlayLog from '../internal/event-tracking/play-log/index.js';
import * as StreamingMetrics from '../internal/event-tracking/streaming-metrics/index.js';
import {
  type BasePayload as PlaybackStatisticsPayload,
  type StatisticsOutputType,
  transformOutputType,
} from '../internal/event-tracking/streaming-metrics/playback-statistics.js';
import { load } from '../internal/handlers/load.js';
import { getIsPostPaywall } from '../internal/helpers/get-is-post-paywall.js';
import type { StreamInfo } from '../internal/helpers/manifest-parser.js';
import { normalizeVolume } from '../internal/helpers/normalize-volume.js';
import type { PlaybackInfo } from '../internal/helpers/playback-info-resolver.js';
import { streamingSessionStore } from '../internal/helpers/streaming-session-store.js';
import { waitFor } from '../internal/helpers/wait-for.js';
import type { OutputType } from '../internal/output-devices.js';
import { trueTime } from '../internal/true-time.js';

import { playerState } from './state.js';

export type LoadPayload = {
  assetPosition: number;
  mediaProduct: MediaProduct;
  playbackInfo: PlaybackInfo;
  streamInfo: StreamInfo;
};

const MAX_DEBUG_STRING_LENGTH = 500;

function sanitizeDebugValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeDebugString(value);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Error) {
    return {
      message: value.message,
      name: value.name,
      stack: value.stack,
    };
  }

  if (value instanceof Event || value instanceof Element) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeDebugValue);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (isSensitiveDebugKey(key)) {
      sanitized[key] =
        typeof nestedValue === 'string'
          ? `[redacted ${key}, ${nestedValue.length} chars]`
          : `[redacted ${key}]`;
      continue;
    }

    sanitized[key] = sanitizeDebugValue(nestedValue);
  }

  return sanitized;
}

// Sanitize a standalone string argument. Standalone strings can also carry
// secrets -- e.g. callers that pass a stream URL or token directly as a
// positional debugLog() arg -- so we apply the same defensive treatment as
// when they appear under sensitive object keys: strip query strings off
// URL-like values (where TIDAL stream/license URLs carry tokens), redact
// data URLs, and truncate anything else that's unreasonably long.
function sanitizeDebugString(value: string): string {
  if (value.startsWith('data:')) {
    return `[redacted data URL, ${value.length} chars]`;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    const queryIndex = value.indexOf('?');
    if (queryIndex !== -1) {
      return `${value.slice(0, queryIndex)}?[redacted query, ${value.length - queryIndex - 1} chars]`;
    }
  }

  if (value.length > MAX_DEBUG_STRING_LENGTH) {
    return `${value.slice(0, MAX_DEBUG_STRING_LENGTH)}...[truncated ${value.length} chars]`;
  }

  return value;
}

// Keys whose values shouldn't be written to debug logs. The `token` substring
// match catches all current and any future credential-bearing fields
// (e.g. `securityToken`, `licenseSecurityToken`, `accessToken`) without us
// having to keep an exhaustive enumeration in sync.
function isSensitiveDebugKey(key: string): boolean {
  if (key === 'manifest' || key === 'streamUrl') {
    return true;
  }
  return /token/i.test(key);
}

function playbackStatisticsEndReason(
  endReason: EndReason,
): PlaybackStatisticsPayload['endReason'] {
  switch (endReason) {
    case 'completed':
      return 'COMPLETE';
    case 'error':
      return 'ERROR';
    case 'skip':
    default:
      return 'OTHER';
  }
}

export class BasePlayer {
  #currentStreamingSessionId: string | undefined;

  #currentTime!: number;
  #endedHandler: ((arg0: EndedEvent) => Promise<void>) | undefined;

  #hasEmittedPreloadRequest: boolean | undefined = undefined;

  #outputDeviceType: StatisticsOutputType | undefined;

  #playbackState: PlaybackState = 'IDLE';

  #preloadedStreamingSessionId: string | undefined;

  #startAssetPosition!: number;

  name: string | undefined;

  constructor() {
    Config.events.addEventListener('desiredVolumeLevel', () => {
      if (this.isActivePlayer) {
        this.updateVolumeLevel();
      }
    });
  }

  // Implements
  #maybeDispatchPreloadRequest() {
    const crossfadeInS = Config.get('crossfadeInMs') / 1000;

    if (
      this.duration &&
      // Check if the current time is within 15 seconds of when next item should start.
      // (reduced from 30s to 15s to reduce risk of Safari background tab throttling)
      Math.abs(this.#currentTime - this.duration + crossfadeInS) <= 15 &&
      // A false check, rather than undefined, ensures a media product transition has been made.
      this.#hasEmittedPreloadRequest === false
    ) {
      this.debugLog(
        'maybeDispatchPreloadRequest',
        {
          crossfadeInS,
          currentTime: this.#currentTime,
          duration: this.duration,
        },
        Math.abs(this.#currentTime - this.duration + crossfadeInS),
      );
      this.#hasEmittedPreloadRequest = true;
      events.dispatchEvent(preloadRequest());
    }
  }

  /**
   * This method should be call whenever a playback ends, for **whatever** reason.
   *
   * ended, completed, skip, reset etc
   */
  #mediaProductEnded({
    endAssetPosition,
    endReason,
    isSeamlessTransition = false,
    streamingSessionId,
  }: {
    endAssetPosition: number;
    endReason: EndReason;
    /**
     * `true` when the outgoing track is being finalized as part of a seamless
     * transition to the next preloaded track -- both true gapless (zero overlap)
     * and crossfade (overlapping fade). Suppresses the custom 'ended' event,
     * the IDLE state change, and the next-product volume update so the app
     * doesn't get notified that playback stopped while the next track is
     * already playing.
     */
    isSeamlessTransition?: boolean;
    streamingSessionId: string;
  }) {
    this.debugLog('mediaProductEnded');

    // Only set idealStartTimestamp for non-seamless transitions. During a
    // seamless transition (gapless or crossfade) the next track already
    // started and the correct timestamp was already set at that time.
    if (!isSeamlessTransition && playerState.preloadedStreamingSessionId) {
      performance.mark(
        'streaming_metrics:playback_statistics:idealStartTimestamp',
        {
          detail: playerState.preloadedStreamingSessionId,
          startTime: trueTime.now(),
        },
      );
    }

    const mediaProductTransition =
      streamingSessionStore.getMediaProductTransition(streamingSessionId);

    // Only dispatch 'ended' for non-seamless transitions. During a seamless
    // transition (gapless or crossfade) playback continues into the next
    // track -- dispatching 'ended' would cause the app to incorrectly
    // advance to the next track.
    if (!isSeamlessTransition && mediaProductTransition) {
      events.dispatchEvent(
        ended(endReason, mediaProductTransition.mediaProduct),
      );
    }

    this.eventTrackingStreamingEnded(streamingSessionId, {
      endAssetPosition,
      endReason,
    });

    streamingSessionStore.deleteSession(streamingSessionId);

    // Check that ended SSI is still same as current before unsetting
    // yo prevent unsetting a started preload.
    if (this.currentStreamingSessionId === streamingSessionId) {
      this.currentStreamingSessionId = undefined;
    }

    // Only update volume for non-seamless transitions. During a seamless
    // transition (gapless or crossfade) the next track is already playing
    // with managed volume.
    if (!isSeamlessTransition) {
      this.updateVolumeLevelForNextProduct();
    }
  }

  adjustedVolume(streamInfo: StreamInfo): number {
    const level = Config.get('desiredVolumeLevel');
    const loudnessNormalizationMode = Config.get('loudnessNormalizationMode');

    let adjustedVolume = level;

    if (loudnessNormalizationMode === 'ALBUM' && streamInfo.albumReplayGain) {
      adjustedVolume *= normalizeVolume(streamInfo.albumReplayGain);
    }

    if (loudnessNormalizationMode === 'TRACK' && streamInfo.trackReplayGain) {
      adjustedVolume *= normalizeVolume(streamInfo.trackReplayGain);
    }

    this.debugLog(
      'adjustedVolume',
      `Volume adjusted from ${level} to ${adjustedVolume}`,
    );

    return parseFloat(adjustedVolume.toFixed(2));
  }

  // Implements
  attachPlaybackEngineEndedHandler() {
    if (!this.#endedHandler) {
      this.#endedHandler = this.playbackEngineEndedHandler.bind(this);
      // TS is weird with CustomEvent event listeners.
      events.addEventListener(
        'ended',
        this.#endedHandler as unknown as EventListener,
      );
    }
  }

  /**
   * Cleans up stored stream info and media product transitions
   * for preloadedStreamingSessionId if it does not match
   * currentStreamingSessionId.
   */
  cleanUpStoredPreloadInfo() {
    if (
      this.preloadedStreamingSessionId &&
      this.preloadedStreamingSessionId !== this.currentStreamingSessionId
    ) {
      streamingSessionStore.deleteSession(this.preloadedStreamingSessionId);
      this.preloadedStreamingSessionId = undefined;
    }
  }

  get currentMediaProduct() {
    return (
      streamingSessionStore.getMediaProductTransition(
        this.currentStreamingSessionId,
      )?.mediaProduct ?? null
    );
  }

  set currentStreamingSessionId(ssi: string | undefined) {
    this.#currentStreamingSessionId = ssi;
  }

  get currentStreamingSessionId() {
    return this.#currentStreamingSessionId;
  }

  set currentTime(seconds: number) {
    this.#currentTime = seconds;
    this.#maybeDispatchPreloadRequest();
  }

  get currentTime() {
    return this.#currentTime;
  }

  // Implements
  debugLog(...args: Array<unknown>) {
    if (
      (document.location.hostname === 'localhost' ||
        document.location.hostname === 'dev.tidal.com') &&
      document.location.hash.includes('debug')
    ) {
      console.debug(
        `[%cPlayerSDK${
          this.name
            ? `%c${
                playerState.activePlayer?.name === this.name ? '⚯' : '⚮'
              }%c` + this.name
            : ''
        }${
          this.#currentStreamingSessionId
            ? '%c::%c' + this.#currentStreamingSessionId?.split('-').pop()
            : ''
        }%c]`,
        'color:#00d6ff', // blue foreground
        ...(this.name
          ? [
              'color:inherit',
              'color:#b7fa34', // green foreground
            ]
          : []),
        ...(this.#currentStreamingSessionId
          ? [
              'color:inherit',
              'color:#d947ff', // purple foreground
            ]
          : []),
        'color:inherit',
        ...args.map(sanitizeDebugValue),
      );
    }
  }

  detachPlaybackEngineEndedHandler() {
    if (this.#endedHandler) {
      // TS is weird with CustomEvent event listeners.
      events.removeEventListener(
        'ended',
        this.#endedHandler as unknown as EventListener,
      );
      this.#endedHandler = undefined;
    }
  }

  get duration() {
    const mtp = streamingSessionStore.getMediaProductTransition(
      this.currentStreamingSessionId,
    );

    if (mtp) {
      return mtp.playbackContext.actualDuration;
    }

    return null;
  }

  /**
   * Commits play_log playbackSession and streaming_metrics playbackStatistics.
   *
   * @param streamingSessionId
   */
  eventTrackingStreamingEnded(
    streamingSessionId: string,
    {
      endAssetPosition,
      endReason,
    }: {
      endAssetPosition: number;
      endReason: EndReason;
    },
  ) {
    const endTimestamp = trueTime.now();

    PlayLog.commit([
      PlayLog.playbackSession({
        endAssetPosition,
        endTimestamp,
        streamingSessionId,
      }),
    ]).catch(console.error);

    StreamingMetrics.commit([
      StreamingMetrics.playbackStatistics({
        endReason: playbackStatisticsEndReason(endReason),
        endTimestamp,
        streamingSessionId,
      }),
      StreamingMetrics.streamingSessionEnd({
        streamingSessionId,
        timestamp: endTimestamp,
      }),
    ]).catch(console.error);
  }

  eventTrackingStreamingStarted(streamingSessionId: string) {
    if (!streamingSessionId) {
      return;
    }

    performance.mark(
      'streaming_metrics:playback_statistics:actualStartTimestamp',
      {
        detail: streamingSessionId,
        startTime: trueTime.now(),
      },
    );

    performance.measure('idealStartTimestamp -> actualStartTimestamp', {
      detail: streamingSessionId,
      end: 'streaming_metrics:playback_statistics:actualStartTimestamp',
      start: 'streaming_metrics:playback_statistics:idealStartTimestamp',
    });

    try {
      // Start filling in playbackStatistics
      StreamingMetrics.playbackStatistics({
        actualStartTimestamp: trueTime.timestamp(
          'streaming_metrics:playback_statistics:actualStartTimestamp',
          streamingSessionId,
        ),
        idealStartTimestamp: trueTime.timestamp(
          'streaming_metrics:playback_statistics:idealStartTimestamp',
          streamingSessionId,
        ),
        outputDevice: this.#outputDeviceType,
        streamingSessionId,
      });
    } catch (e) {
      console.error(
        e,
        'actualStartTimestamp or idealStartTimestamp is missing for this streaming session',
      );
    } finally {
      performance.clearMarks(
        'streaming_metrics:playback_statistics:actualStartTimestamp',
      );

      performance.clearMarks(
        'streaming_metrics:playback_statistics:idealStartTimestamp',
      );
    }

    const mediaProductTransition =
      streamingSessionStore.getMediaProductTransition(streamingSessionId);

    if (!mediaProductTransition) {
      /*
        If a media product transition is missing for a streamingSessionId and playback has been
        started for the same streamingSessionId then we have somehow lost the media product
        transition which is an error.
      */
      if (streamingSessionStore.hasStartedStreamInfo(streamingSessionId)) {
        console.error(
          `A media product transition for streaming session #${streamingSessionId} has not been saved and could thus not be found for play log reporting.`,
        );
      } else {
        // Otherwise the user of Player is just loading anew very fast so then just discard the old session.
        streamingSessionStore.deleteStreamInfo(streamingSessionId);
        console.warn(
          `Streaming session #${streamingSessionId} has been discarded due to a new load. This could mean you have a bug in your code where you call load on Player more than once time in a very short time frame.`,
        );
      }

      return;
    }

    const { mediaProduct, playbackContext } = mediaProductTransition;

    const startTimestamp = trueTime.now();

    PlayLog.playbackSession({
      actualAssetPresentation: playbackContext.actualAssetPresentation,
      actualAudioMode:
        'actualAudioMode' in playbackContext
          ? playbackContext.actualAudioMode
          : null,
      actualProductId: playbackContext.actualProductId,
      actualQuality:
        playbackContext.actualAudioQuality ||
        playbackContext.actualVideoQuality,
      extras: mediaProduct.extras,
      isPostPaywall: getIsPostPaywall(
        playbackContext.actualAssetPresentation,
        mediaProduct,
      ),
      playbackSessionId: streamingSessionId,
      productType: PlayLog.mapProductTypeToPlayLogProductType(
        mediaProduct.productType,
      ),
      requestedProductId: mediaProduct.productId,
      sourceId: mediaProduct.sourceId,
      sourceType: mediaProduct.sourceType,
      startAssetPosition: this.startAssetPosition,
      startTimestamp,
      streamingSessionId,
    }).catch(console.error);
  }

  get expired() {
    const streamInfo = streamingSessionStore.getStreamInfo(
      this.currentStreamingSessionId,
    );

    if (!streamInfo) {
      return false;
    }

    // eslint-disable-next-line no-restricted-syntax
    return streamInfo.expires <= Date.now();
  }

  finishCurrentMediaProduct(
    endReason: EndReason,
    isSeamlessTransition = false,
  ) {
    // A media product was loaded but never started.
    if (!this.hasStarted()) {
      return;
    }

    const cssi = this.#currentStreamingSessionId;
    const hasNotBeenFinished = cssi
      ? streamingSessionStore.hasStreamInfo(cssi)
      : false;

    // Nothing is preloaded, player is now idle.
    // CRITICAL: Skip this for seamless transitions (gapless / crossfade) -
    // the next track is already playing and setting IDLE would dispatch a
    // PlaybackStateChange event and corrupt app state.
    if (!isSeamlessTransition && !this.preloadedStreamingSessionId) {
      this.playbackState = 'IDLE';
    }

    if (cssi && hasNotBeenFinished) {
      this.#mediaProductEnded({
        endAssetPosition: this.currentTime,
        endReason,
        isSeamlessTransition,
        streamingSessionId: cssi,
      });
    }
  }

  getPosition() {
    return 0;
  }

  /**
   * Refetches playbackinfo.
   */
  async hardReload(mediaProduct: MediaProduct, assetPosition: number) {
    if (this.currentStreamingSessionId) {
      this.finishCurrentMediaProduct('skip');
    }

    return load(mediaProduct, assetPosition);
  }

  hasNextItem() {
    return this.preloadedStreamingSessionId;
  }

  hasStarted() {
    return (
      this.currentStreamingSessionId &&
      streamingSessionStore.hasStartedStreamInfo(this.currentStreamingSessionId)
    );
  }

  get isActivePlayer() {
    return (
      playerState.activePlayer && this.name === playerState.activePlayer.name
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  load(_lp: LoadPayload, _transition: 'explicit' | 'implicit') {
    return Promise.resolve();
  }

  /**
   * If playback info is prefetched or expired, do a hard reload.
   *
   * @returns {boolean} True if hard reloaded, else false.
   */
  async maybeHardReload() {
    // Not the same as OR in an if statement.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const prefetchedOrExpired = this.prefetched || this.expired;

    if (this.currentMediaProduct && prefetchedOrExpired) {
      // Preserve the current position (e.g., if user seeked before playing)
      await this.hardReload(this.currentMediaProduct, this.currentTime);
      return true;
    }

    return false;
  }

  /**
   * This method should be call whenever a playback starts, for **whatever** reason.
   *
   * skip, load.
   *
   * @param streamingSessionId
   */
  mediaProductStarted(streamingSessionId: string | undefined) {
    if (
      !streamingSessionId ||
      streamingSessionStore.hasStartedStreamInfo(streamingSessionId)
    ) {
      return;
    }

    this.debugLog('mediaProductStarted');

    this.eventTrackingStreamingStarted(streamingSessionId);
    streamingSessionStore.setStartedStreamInfo(streamingSessionId);
    this.updateVolumeLevel();
    this.#hasEmittedPreloadRequest = false;

    this.preloadedStreamingSessionId = undefined;

    this.unloadPreloadedMediaProduct().catch(console.error);
    this.attachPlaybackEngineEndedHandler();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next(_lp: LoadPayload) {
    return Promise.resolve();
  }

  get nextItem() {
    if (this.preloadedStreamingSessionId) {
      return streamingSessionStore.getMediaProductTransition(
        this.preloadedStreamingSessionId,
      );
    }

    return undefined;
  }

  set outputDeviceType(ot: OutputType | undefined) {
    this.#outputDeviceType = ot ? transformOutputType(ot) : undefined;
  }

  /**
   * When re-using a nexted item for a load, overwrite the nexted MediaProduct with the provided one.
   * To ensure sourceId, sourceType and referenceId from the load call is correct for the playback -
   * and not a stale incorrect one from the next call.
   *
   * @param streamingSessionId
   * @param partialMediaProduct
   */
  overwriteMediaProduct(
    streamingSessionId: string,
    partialMediaProduct: Partial<MediaProduct>,
  ) {
    const oldMediaProductTransition =
      streamingSessionStore.getMediaProductTransition(streamingSessionId);

    if (oldMediaProductTransition) {
      streamingSessionStore.deleteMediaProductTransition(streamingSessionId);

      const newMediaProductTransition: MediaProductTransitionPayload = {
        mediaProduct: {
          ...oldMediaProductTransition.mediaProduct,
          ...partialMediaProduct,
        },
        playbackContext: {
          ...oldMediaProductTransition.playbackContext,
        },
      };

      streamingSessionStore.saveMediaProductTransition(
        streamingSessionId,
        newMediaProductTransition,
      );
    }
  }

  pause() {}

  play() {
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  playbackEngineEndedHandler(_e: EndedEvent) {
    return Promise.resolve();
  }

  set playbackState(newPlaybackState: PlaybackState) {
    const currentPlaybackState = this.#playbackState;

    // Ignore dispatching playbackStateChange if the state doesn't change.
    if (currentPlaybackState === newPlaybackState) {
      return;
    }

    if (!this.currentStreamingSessionId) {
      return;
    }

    const fromTo = (from: PlaybackState, to: PlaybackState) =>
      currentPlaybackState === from && to === newPlaybackState;

    switch (true) {
      case fromTo('NOT_PLAYING', 'STALLED'):
      case fromTo('IDLE', 'STALLED'):
        return;
      case fromTo('PLAYING', 'NOT_PLAYING'):
      case fromTo('PLAYING', 'IDLE'): {
        if (this.duration && this.currentTime < this.duration) {
          PlayLog.playbackSessionAction(this.currentStreamingSessionId, {
            actionType: 'PLAYBACK_STOP',
            assetPosition: this.currentTime,
            timestamp: trueTime.now(),
          }).catch(console.error);
        }
        break;
      }
      case fromTo('IDLE', 'PLAYING'):
      case fromTo('NOT_PLAYING', 'PLAYING'): {
        if (this.currentTime !== this.startAssetPosition) {
          PlayLog.playbackSessionAction(this.currentStreamingSessionId, {
            actionType: 'PLAYBACK_START',
            assetPosition: this.currentTime,
            timestamp: trueTime.now(),
          }).catch(console.error);
        }
        break;
      }
      default:
        break;
    }

    this.#playbackState = newPlaybackState;
    this.debugLog(`playbackState: ${newPlaybackState}`);
    const noPlayerActive = playerState.activePlayer === undefined;

    if (this.isActivePlayer || noPlayerActive) {
      events.dispatchEvent(playbackStateChange(this.#playbackState));
    }
  }

  get playbackState() {
    return this.#playbackState;
  }

  get prefetched() {
    const streamInfo = streamingSessionStore.getStreamInfo(
      this.currentStreamingSessionId,
    );

    return streamInfo?.prefetched;
  }

  set preloadedStreamingSessionId(ssi: string | undefined) {
    this.#preloadedStreamingSessionId = ssi;
  }

  get preloadedStreamingSessionId() {
    return this.#preloadedStreamingSessionId;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  reset(_options: { keepPreload: boolean }) {
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  seek(_number: number) {}

  /**
   * Handle play log reporting for seeking.
   * Seek start should log a PLAYBACK_START action if playing post seek.
   */
  seekEnd(assetPosition: number) {
    const streamingSessionId = this.currentStreamingSessionId;

    if (streamingSessionId) {
      const logEvent = () =>
        PlayLog.playbackSessionAction(streamingSessionId, {
          actionType: 'PLAYBACK_START',
          assetPosition,
          timestamp: trueTime.now(),
        });

      if (this.playbackState === 'PLAYING') {
        logEvent().catch(console.error);
      } else {
        const handlePlaybackStateChange = () => {
          if (this.playbackState === 'PLAYING') {
            logEvent().catch(console.error);

            events.removeEventListener(
              'playback-state-change',
              handlePlaybackStateChange,
            );
          }
        };
        events.addEventListener(
          'playback-state-change',
          handlePlaybackStateChange,
        );
      }
    }
  }

  /**
   * Handle play log reporting for seeking.
   * Seek start should log a PLAYBACK_STOP action.
   */
  seekStart(assetPosition: number) {
    if (this.currentStreamingSessionId) {
      PlayLog.playbackSessionAction(this.currentStreamingSessionId, {
        actionType: 'PLAYBACK_STOP',
        assetPosition,
        timestamp: trueTime.now(),
      }).catch(console.error);
    }
  }

  async setStateToXIfNotYInZMs(
    ms: number,
    ifNotState: PlaybackState,
    setToState: PlaybackState,
  ) {
    await waitFor(ms);

    if (this.playbackState !== ifNotState) {
      this.playbackState = setToState;
    }
  }

  skipToPreloadedMediaProduct() {
    return Promise.resolve();
  }

  get startAssetPosition() {
    return this.#startAssetPosition;
  }

  set startAssetPosition(assetPosition: number) {
    this.#startAssetPosition = assetPosition;
  }

  unloadPreloadedMediaProduct() {
    return Promise.resolve();
  }

  updateOutputDevice() {
    return Promise.resolve();
  }

  /**
   * Hydrates the volume level from config, and adjusts
   * it before setting, if loudness normalization is
   * enabled.
   */
  updateVolumeLevel() {
    const streamInfo = streamingSessionStore.getStreamInfo(
      this.currentStreamingSessionId,
    );

    if (!streamInfo) {
      return;
    }

    this.volume = this.adjustedVolume(streamInfo);
  }

  /**
   * Adjusts the volume for the next track.
   * Can be called on product ended to have the level ready.
   */
  updateVolumeLevelForNextProduct() {
    const streamInfo = streamingSessionStore.getStreamInfo(
      this.preloadedStreamingSessionId,
    );

    if (streamInfo) {
      this.volume = this.adjustedVolume(streamInfo);
    } // else: Will be adjusted on start instead.
  }

  get volume() {
    return 1;
  }

  set volume(_number: number) {}
}
