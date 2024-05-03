import { type EndReason, type EndedEvent, ended } from '../api/event/ended';
import type { MediaProductTransitionPayload } from '../api/event/media-product-transition';
import { playbackStateChange } from '../api/event/playback-state-change';
import { preloadRequest } from '../api/event/preload-request';
import type { MediaProduct, PlaybackState } from '../api/interfaces';
import * as Config from '../config';
import { events } from '../event-bus';
import * as PlayLog from '../internal/event-tracking/play-log/index';
import * as Playback from '../internal/event-tracking/playback/index';
import * as StreamingMetrics from '../internal/event-tracking/streaming-metrics/index';
import {
  type BasePayload as PlaybackStatisticsPayload,
  type StatisticsOutputType,
  transformOutputType,
} from '../internal/event-tracking/streaming-metrics/playback-statistics';
import { load } from '../internal/handlers/load';
import type { StreamInfo } from '../internal/helpers/manifest-parser';
import { normalizeVolume } from '../internal/helpers/normalize-volume';
import type { PlaybackInfo } from '../internal/helpers/playback-info-resolver';
import { streamingSessionStore } from '../internal/helpers/streaming-session-store';
import { waitFor } from '../internal/helpers/wait-for';
import type { OutputType } from '../internal/output-devices';
import { trueTime } from '../internal/true-time';

import { playerState } from './state';

export type LoadPayload = {
  assetPosition: number;
  mediaProduct: MediaProduct;
  playbackInfo: PlaybackInfo;
  streamInfo: StreamInfo;
};

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

  #startedStreamInfos = new Map<string, boolean>();

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
    if (
      this.duration &&
      Math.abs(this.#currentTime - this.duration) <= 30 &&
      // A false check, rather than undefined, ensures a media product transition hs been made.
      this.#hasEmittedPreloadRequest === false
    ) {
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
    streamingSessionId,
  }: {
    endAssetPosition: number;
    endReason: EndReason;
    streamingSessionId: string;
  }) {
    this.debugLog('mediaProductEnded');

    // If there is a preloaded item if should start right away.
    if (playerState.preloadedStreamingSessionId) {
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

    if (mediaProductTransition) {
      events.dispatchEvent(
        ended(endReason, mediaProductTransition.mediaProduct),
      );
    }

    this.eventTrackingStreamingEnded(streamingSessionId, {
      endAssetPosition,
      endReason,
    });
    this.reportPlaybackProgress(streamingSessionId);

    streamingSessionStore.deleteSession(streamingSessionId);

    this.#startedStreamInfos.delete(streamingSessionId);

    // Check that ended SSI is still same as current before unsetting
    // yo prevent unsetting a started preload.
    if (this.currentStreamingSessionId === streamingSessionId) {
      this.currentStreamingSessionId = undefined;
    }

    this.updateVolumeLevelForNextProduct();
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

  // Implements
  debugLog(...args: Array<unknown>) {
    if (
      document.location.href.includes('localhost') &&
      document.location.hash.includes('debug')
    ) {
      // eslint-disable-next-line prefer-rest-params
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
        ...args,
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

    PlayLog.commit({
      events: [
        PlayLog.playbackSession({
          endAssetPosition,
          endTimestamp,
          streamingSessionId,
        }),
      ],
    }).catch(console.error);

    StreamingMetrics.commit({
      events: [
        StreamingMetrics.playbackStatistics({
          endReason: playbackStatisticsEndReason(endReason),
          endTimestamp,
          streamingSessionId,
        }),
        StreamingMetrics.streamingSessionEnd({
          streamingSessionId,
          timestamp: endTimestamp,
        }),
      ],
    }).catch(console.error);
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
      if (this.#startedStreamInfos.has(streamingSessionId)) {
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
      isPostPaywall: playbackContext.actualAssetPresentation === 'FULL',
      playbackSessionId: streamingSessionId,
      productType: mediaProduct.productType === 'track' ? 'TRACK' : 'VIDEO',
      requestedProductId: mediaProduct.productId,
      sourceId: mediaProduct.sourceId,
      sourceType: mediaProduct.sourceType,
      startAssetPosition: this.startAssetPosition,
      startTimestamp,
      streamingSessionId,
    });
  }

  finishCurrentMediaProduct(endReason: EndReason) {
    // A media product was loaded but never started.
    if (!this.hasStarted()) {
      return;
    }

    const cssi = this.#currentStreamingSessionId;
    const hasNotBeenFinished = cssi
      ? streamingSessionStore.hasStreamInfo(cssi)
      : false;

    // Nothing is preloaded, player is now idle.
    if (!this.preloadedStreamingSessionId) {
      this.playbackState = 'IDLE';
    }

    if (cssi && hasNotBeenFinished) {
      this.#mediaProductEnded({
        endAssetPosition: this.currentTime,
        endReason,
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
    return (
      this.preloadedStreamingSessionId &&
      streamingSessionStore.hasMediaProductTransition(
        this.preloadedStreamingSessionId,
      )
    );
  }

  hasStarted() {
    return (
      this.currentStreamingSessionId &&
      this.#startedStreamInfos.has(this.currentStreamingSessionId)
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
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
      await this.hardReload(this.currentMediaProduct, 0);
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
      this.#startedStreamInfos.has(streamingSessionId)
    ) {
      return;
    }

    this.debugLog('mediaProductStarted');

    this.eventTrackingStreamingStarted(streamingSessionId);
    this.#startedStreamInfos.set(streamingSessionId, true);
    this.updateVolumeLevel();
    this.#hasEmittedPreloadRequest = false;

    this.preloadedStreamingSessionId = undefined;

    this.unloadPreloadedMediaProduct().catch(console.error);
    this.attachPlaybackEngineEndedHandler();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  next(_lp: LoadPayload) {
    return Promise.resolve();
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  playbackEngineEndedHandler(_e: EndedEvent) {
    return Promise.resolve();
  }

  reportPlaybackProgress(streamingSessionId: string) {
    const mediaProductTransition =
      streamingSessionStore.getMediaProductTransition(streamingSessionId);

    if (!mediaProductTransition) {
      return;
    }

    const { mediaProduct, playbackContext } = mediaProductTransition;

    if (this.#currentStreamingSessionId) {
      Playback.commit({
        events: [
          Playback.progress({
            playback: {
              durationMS: Math.floor(playbackContext.actualDuration * 1000),
              id: mediaProduct.productId,
              playedMS: Math.floor(this.currentTime * 1000),
              source: {
                id: mediaProduct.sourceId,
                type: mediaProduct.sourceType,
              },
              type: mediaProduct.productType === 'track' ? 'TRACK' : 'VIDEO',
            },
            streamingSessionId: this.#currentStreamingSessionId,
          }),
        ],
      }).catch(console.error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  reset(_options: { keepPreload: boolean }) {
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
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
      });
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

  get duration() {
    const mtp = streamingSessionStore.getMediaProductTransition(
      this.currentStreamingSessionId,
    );

    if (mtp) {
      return mtp.playbackContext.actualDuration;
    }

    return null;
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

  get isActivePlayer() {
    return (
      playerState.activePlayer && this.name === playerState.activePlayer.name
    );
  }

  get nextItem() {
    if (this.preloadedStreamingSessionId) {
      return streamingSessionStore.getMediaProductTransition(
        this.preloadedStreamingSessionId,
      );
    }

    return undefined;
  }

  // eslint-disable-next-line accessor-pairs
  set outputDeviceType(ot: OutputType | undefined) {
    this.#outputDeviceType = ot ? transformOutputType(ot) : undefined;
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
        this.reportPlaybackProgress(this.currentStreamingSessionId);

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

    return streamInfo && streamInfo.prefetched;
  }

  set preloadedStreamingSessionId(ssi: string | undefined) {
    this.#preloadedStreamingSessionId = ssi;
  }

  get preloadedStreamingSessionId() {
    return this.#preloadedStreamingSessionId;
  }

  get startAssetPosition() {
    return this.#startAssetPosition;
  }

  set startAssetPosition(assetPosition: number) {
    this.#startAssetPosition = assetPosition;
  }

  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  get volume() {
    return 1;
  }

  set volume(_number: number) {}
}
