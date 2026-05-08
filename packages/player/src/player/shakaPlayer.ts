import shaka from 'shaka-player';
// If you want to use the debug version, switch to the line below:
// import shaka from 'shaka-player/dist/shaka-player.compiled.debug.js';

import { activeDeviceChanged as activeDeviceChangedEvent } from '../api/event/active-device-changed';
import type { EndedEvent } from '../api/event/ended';
import { mediaProductTransition as mediaProductTransitionEvent } from '../api/event/media-product-transition';
import type { MediaProduct, PlaybackContext } from '../api/interfaces';
import * as Config from '../config';
import { events } from '../event-bus';
import {
  type ErrorCodes,
  PlayerError,
  credentialsProviderStore,
} from '../internal';
import * as StreamingMetrics from '../internal/event-tracking/streaming-metrics/index';
import { composePlaybackContext } from '../internal/helpers/compose-playback-context';
import type { StreamInfo } from '../internal/helpers/manifest-parser';
import { createMediaElementErrorCircuitBreaker } from '../internal/helpers/media-element-error-circuit-breaker';
import type { PlaybackInfo } from '../internal/helpers/playback-info-resolver';
import { streamingSessionStore } from '../internal/helpers/streaming-session-store';
import { updatePlaybackQuality } from '../internal/helpers/update-playback-quality';
import { waitFor } from '../internal/helpers/wait-for';
import type { OutputDevices } from '../internal/output-devices';
import { trueTime } from '../internal/true-time';

import { registerAdaptations } from './adaptations';
import {
  ensureVideoElementsMounted,
  mediaElementOne,
  mediaElementTwo,
} from './audio-context-store';
import type { LoadPayload } from './basePlayer';
import { BasePlayer } from './basePlayer';
import * as FairplayDRM from './fairplay-drm';
import { registerStalls } from './stalls';
import { playerState } from './state';

let outputDevices: OutputDevices | undefined;

function responseURIToCDMType(uri: string) {
  const lastPath = uri.split('/').pop()?.split('?')[0];

  switch (lastPath) {
    case 'fairplay':
      return 'FAIR_PLAY';
    case 'widevine':
      return 'WIDEVINE';
    default:
      return 'NONE';
  }
}

const serverCertificateWidevine = new Uint8Array([
  10, 193, 2, 8, 3, 18, 16, 23, 5, 185, 23, 204, 18, 4, 134, 139, 6, 51, 58, 47,
  119, 42, 140, 24, 130, 180, 130, 146, 5, 34, 142, 2, 48, 130, 1, 10, 2, 130,
  1, 1, 0, 153, 237, 91, 59, 50, 125, 171, 94, 36, 239, 195, 182, 42, 149, 181,
  152, 82, 10, 213, 188, 203, 55, 80, 62, 6, 69, 184, 20, 216, 118, 184, 223,
  64, 81, 4, 65, 173, 140, 227, 173, 177, 27, 184, 140, 78, 114, 90, 94, 74,
  158, 7, 149, 41, 29, 88, 88, 64, 35, 167, 225, 175, 14, 56, 169, 18, 121, 57,
  48, 8, 97, 11, 111, 21, 140, 135, 140, 126, 33, 191, 251, 254, 234, 119, 225,
  1, 158, 30, 87, 129, 232, 164, 95, 70, 38, 61, 20, 230, 14, 128, 88, 168, 96,
  122, 220, 224, 79, 172, 132, 87, 177, 55, 168, 214, 124, 205, 235, 51, 112,
  93, 152, 58, 33, 251, 78, 236, 189, 74, 16, 202, 71, 73, 12, 164, 126, 170,
  93, 67, 130, 24, 221, 186, 241, 202, 222, 51, 146, 241, 61, 111, 251, 100, 66,
  253, 49, 225, 191, 64, 176, 198, 4, 209, 196, 186, 76, 149, 32, 164, 191, 151,
  238, 189, 96, 146, 154, 252, 238, 245, 91, 186, 245, 100, 226, 208, 231, 108,
  215, 197, 92, 115, 160, 130, 185, 150, 18, 11, 131, 89, 237, 206, 36, 112,
  112, 130, 104, 13, 111, 103, 198, 216, 44, 74, 197, 243, 19, 68, 144, 167, 78,
  236, 55, 175, 75, 47, 1, 12, 89, 232, 40, 67, 226, 88, 47, 11, 107, 159, 93,
  176, 252, 94, 110, 223, 100, 251, 211, 8, 180, 113, 27, 207, 18, 80, 1, 156,
  159, 90, 9, 2, 3, 1, 0, 1, 58, 20, 108, 105, 99, 101, 110, 115, 101, 46, 119,
  105, 100, 101, 118, 105, 110, 101, 46, 99, 111, 109, 18, 128, 3, 174, 52, 115,
  20, 181, 168, 53, 41, 127, 39, 19, 136, 251, 123, 184, 203, 82, 119, 210, 73,
  130, 60, 221, 209, 218, 48, 185, 51, 57, 81, 30, 179, 204, 189, 234, 4, 185,
  68, 185, 39, 193, 33, 52, 110, 253, 189, 234, 201, 212, 19, 145, 126, 110,
  193, 118, 161, 4, 56, 70, 10, 80, 59, 193, 149, 43, 155, 164, 228, 206, 15,
  196, 191, 194, 10, 152, 8, 170, 175, 75, 252, 209, 156, 29, 207, 205, 245,
  116, 204, 172, 40, 209, 180, 16, 65, 108, 249, 222, 136, 4, 48, 28, 189, 179,
  52, 202, 252, 208, 212, 9, 120, 66, 58, 100, 46, 84, 97, 61, 240, 175, 207,
  150, 202, 74, 146, 73, 216, 85, 228, 43, 58, 112, 62, 241, 118, 127, 106, 155,
  211, 109, 107, 248, 43, 231, 107, 191, 12, 186, 79, 222, 89, 210, 171, 204,
  118, 254, 182, 66, 71, 184, 92, 67, 31, 188, 165, 34, 102, 182, 25, 252, 54,
  151, 149, 67, 252, 169, 203, 189, 187, 250, 250, 14, 26, 85, 231, 85, 163,
  199, 188, 230, 85, 249, 100, 111, 88, 42, 185, 207, 112, 170, 8, 185, 121,
  248, 103, 246, 58, 11, 43, 127, 219, 54, 44, 91, 196, 236, 213, 85, 216, 91,
  202, 169, 197, 147, 195, 131, 200, 87, 212, 157, 170, 183, 126, 64, 183, 133,
  29, 223, 210, 73, 152, 128, 142, 53, 178, 88, 231, 93, 120, 234, 192, 202, 22,
  247, 4, 115, 4, 194, 13, 147, 237, 228, 232, 255, 28, 111, 23, 230, 36, 62,
  63, 61, 168, 252, 23, 9, 135, 14, 196, 95, 186, 130, 58, 38, 63, 12, 239, 161,
  247, 9, 59, 25, 9, 146, 131, 38, 51, 55, 5, 4, 58, 41, 189, 166, 249, 180, 52,
  44, 200, 223, 84, 60, 177, 161, 24, 47, 124, 95, 255, 51, 241, 4, 144, 250,
  202, 91, 37, 54, 11, 118, 1, 94, 156, 90, 6, 171, 142, 224, 47, 0, 210, 232,
  213, 152, 97, 4, 170, 204, 77, 212, 117, 253, 150, 238, 156, 228, 227, 38,
  242, 27, 131, 199, 5, 133, 119, 179, 135, 50, 205, 218, 188, 106, 107, 237,
  19, 251, 13, 73, 211, 138, 69, 235, 135, 165, 244,
]);

// eslint-disable-next-line import/no-default-export
export default class ShakaPlayer extends BasePlayer {
  // Gapless micro-crossfade defaults (used when crossfadeInMs === 0).
  // The crossfade ramp itself is short (~250ms over ~16 setTimeout ticks);
  // long enough to mask buffer boundaries but short enough that listeners
  // perceive the transition as truly gapless.
  static readonly #GAPLESS_CROSSFADE_MS = 250;
  // The trigger window matches the crossfade duration, so the swap completes
  // approximately when the outgoing track reaches its natural end. (Going
  // wider would chop audible audio off the end of the outgoing track AND
  // skip extra intro from the new one, since the new track plays for the
  // entire trigger window before the swap.) The "transition missed"
  // fallback in playbackEngineEndedHandler covers cases where the ~4Hz
  // timeupdate cadence skips past this window entirely.
  static readonly #GAPLESS_START_BEFORE_END_S = 0.25;

  #activePlayer: 1 | 2 = 1;

  #crossfadeDeadlineTimerId: ReturnType<typeof setTimeout> | null = null;
  #crossfadeInProgress = false;
  #crossfadeStepTimerId: ReturnType<typeof setTimeout> | null = null;
  // Scheduled trigger for starting the crossfade based on the active track's
  // duration. This is the primary trigger -- timeupdate is only a fallback
  // (timeupdate fires at ~4Hz which can skip past the 250ms trigger window).
  #crossfadeTriggerTimerId: ReturnType<typeof setTimeout> | null = null;
  // Token identifying the in-flight transition. Step/deadline timers capture
  // this in their closures so a stale callback (e.g. one that fired after a
  // reset() or after the user skipped) becomes a safe no-op.
  #currentTransitionToken: object | undefined = undefined;

  #isReset = true;

  #librariesLoad: Promise<void>;

  #mediaElementErrorCircuitBreaker = createMediaElementErrorCircuitBreaker();

  #mediaElementEventHandlers: {
    durationChangeHandler: EventListener;
    endedHandler: EventListener;
    errorHandler: EventListener;
    pauseHandler: EventListener;
    playHandler: EventListener;
    playingHandler: EventListener;
    seekedHandler: EventListener;
    stalledHandler: EventListener;
    timeUpdateHandler: EventListener;
    waitingHandler: EventListener;
  };

  // Track which session is on which player for proper ended event handling
  #playerOneSessionId: string | undefined;

  #playerTwoSessionId: string | undefined;

  #preloadReady = false;
  #preloadedPayload: LoadPayload | null = null;
  #shakaEventHandlers: {
    bufferingHandler: EventListener;
    errorHandler: EventListener;
    loadedHandler: EventListener;
    stallDetectedHandler: EventListener;
  };

  // Dual player setup for gapless playback
  #shakaInstanceOne: shaka.Player | undefined;
  #shakaInstanceTwo: shaka.Player | undefined;

  #shouldRetryStreaming = false;

  name = 'shakaPlayer';

  constructor() {
    super();

    this.playbackState = 'IDLE';
    this.#librariesLoad = this.#loadLibraries();

    if (Config.get('outputDevicesEnabled')) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      (async () => {
        const impMod = await import('../internal/output-devices');

        outputDevices = impMod.outputDevices;
      })();
    }

    /**
     * Check if an event should be ignored based on its source.
     * Returns true if the event is from an inactive source and should be ignored.
     * For dual-player gapless: only process events from the active media element or Shaka instance.
     */
    const shouldIgnoreEvent = (e?: Event): boolean => {
      if (!e) {
        return false;
      }

      const target = e.target;
      if (target instanceof HTMLMediaElement) {
        return target !== this.#getActiveMediaElement();
      } else if (target instanceof shaka.Player) {
        return target !== this.#getActiveShakaInstance();
      } else {
        // Ignore events from unknown sources.
        return true;
      }
    };

    const setPlaying = (e?: Event) => {
      if (shouldIgnoreEvent(e)) {
        return;
      }

      // Safari tend to send events wrongly. Verify the media event is actually playing before sending setting state.
      if (this.mediaElement && !this.mediaElement.paused) {
        this.playbackState = 'PLAYING';
      }
    };

    const setStalled = (e: Event) => {
      if (shouldIgnoreEvent(e)) {
        return;
      }

      // Buffering event from shaka with this networkState is the real "waiting" event: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/waiting_event
      // "The waiting event is fired when playback has stopped because of a temporary lack of data."
      const shakaWaiting =
        e.type === 'buffering' &&
        this.mediaElement?.networkState === HTMLMediaElement.NETWORK_LOADING;

      // Safari tend to send events wrongly. Verify the media event is actually paused before sending setting state.
      if (this.mediaElement?.paused || shakaWaiting) {
        this.playbackState = 'STALLED';
      }
    };

    const setNotPlaying = (e?: Event) => {
      if (shouldIgnoreEvent(e)) {
        return;
      }

      (async () => {
        const mostLikelyWillPlayPreloadASAP =
          this.mediaElement &&
          this.preloadedStreamingSessionId &&
          this.mediaElement.currentTime === this.mediaElement.duration;

        if (mostLikelyWillPlayPreloadASAP) {
          await waitFor(1000);

          const actuallyPlayedPreload =
            this.mediaElement &&
            this.mediaElement.currentTime !== this.mediaElement.duration;

          if (actuallyPlayedPreload) {
            return;
          }
        }

        this.playbackState = 'NOT_PLAYING';
      })().catch(console.error);
    };

    const timeUpdateHandler = (e: Event) => {
      const mediaElement = e.target as HTMLMediaElement;
      const activeMediaElement = this.#getActiveMediaElement();
      const isActiveElement = mediaElement === activeMediaElement;

      // Only update currentTime from active media element
      if (
        isActiveElement &&
        mediaElement.readyState > HTMLMediaElement.HAVE_NOTHING
      ) {
        this.currentTime = mediaElement.currentTime;
      }

      // Track transition logic (crossfade / gapless)
      if (isActiveElement && this.#preloadedPayload && this.#preloadReady) {
        const timeRemaining = mediaElement.duration - mediaElement.currentTime;
        const { startBeforeEndS } = this.#getTransitionConfig();

        if (
          !this.#crossfadeInProgress &&
          // timeupdate also fires after a seek while the element is paused;
          // without this guard we'd start playing the next track even though
          // the user is paused.
          !mediaElement.paused &&
          timeRemaining <= startBeforeEndS &&
          timeRemaining > 0
        ) {
          this.#startTransition().catch(console.error);
        }
      }
    };

    const durationChangeHandler = (e: Event) => {
      if (this.currentStreamingSessionId) {
        if (
          e.target instanceof HTMLMediaElement &&
          e.target === this.#getActiveMediaElement()
        ) {
          streamingSessionStore.overwriteDuration(
            this.currentStreamingSessionId,
            e.target.duration,
          );
        }
      }
    };

    const endedHandler = (e: Event) => {
      const mediaElement = e.target as HTMLMediaElement;
      timeUpdateHandler(e);

      // Determine which player fired the ended event and finish its session
      const isPlayerOne = mediaElement === mediaElementOne;
      const sessionIdToFinish = isPlayerOne
        ? this.#playerOneSessionId
        : this.#playerTwoSessionId;

      if (sessionIdToFinish) {
        const isCurrentSession =
          this.currentStreamingSessionId === sessionIdToFinish;

        // If a crossfade transition is in progress and the ENDED element is
        // the active session, the swap is already in flight. Calling
        // finishCurrentMediaProduct() here would delete the session from
        // streamingSessionStore and unset currentStreamingSessionId, leaving
        // the player pointing at deleted data for the rest of the crossfade
        // (~250ms) -- duration / playbackContext getters would return null.
        // Bail out and let #completeTransition do the cleanup naturally:
        //   - keep #playerOneSessionId / #playerTwoSessionId set so its
        //     `outgoingSessionId` branch picks up the just-ended session and
        //     finalizes it via finishCurrentMediaProduct('completed', true)
        //   - we don't dispatch a custom 'ended' event ourselves, so
        //     playbackEngineEndedHandler's fallback (skipToPreloadedMediaProduct)
        //     doesn't race with the in-flight transition.
        if (isCurrentSession && this.#crossfadeInProgress) {
          this.debugLog(
            `Active track ended mid-crossfade (session: ${sessionIdToFinish}) -- letting #completeTransition finalize`,
          );
          return;
        }

        // Ensure currentTime reflects the ended media element, even if it is
        // inactive after gapless crossfade. This is critical for accurate
        // endAssetPosition reporting in finishCurrentMediaProduct().
        // Gated on sessionIdToFinish so a stale `ended` event from a player
        // whose session id was already cleared can't clobber the active
        // player's currentTime.
        if (mediaElement.readyState > HTMLMediaElement.HAVE_NOTHING) {
          this.currentTime = mediaElement.currentTime;
        }

        this.debugLog(
          `Ended event from player ${isPlayerOne ? 1 : 2} (session: ${sessionIdToFinish})`,
        );

        if (isCurrentSession) {
          this.finishCurrentMediaProduct('completed');
        } else {
          // Gapless case: Track has already been replaced by another track
          // that's actively playing. Finish the session without mutating
          // global playback state (which would incorrectly set IDLE).
          const savedPlaybackState = this.playbackState;
          const savedCurrentSessionId = this.currentStreamingSessionId;

          // Temporarily swap to the ending session for finishCurrentMediaProduct
          this.currentStreamingSessionId = sessionIdToFinish;
          this.finishCurrentMediaProduct('completed', true);

          // Restore state - the active track is still playing
          this.currentStreamingSessionId = savedCurrentSessionId;
          this.playbackState = savedPlaybackState;

          // Also restore currentTime to reflect the active player
          const activeMediaElement = this.#getActiveMediaElement();
          if (
            activeMediaElement &&
            activeMediaElement.readyState > HTMLMediaElement.HAVE_NOTHING
          ) {
            this.currentTime = activeMediaElement.currentTime;
          }
        }

        // Clear the finished session ID from the player
        if (isPlayerOne) {
          this.#playerOneSessionId = undefined;
        } else {
          this.#playerTwoSessionId = undefined;
        }
      }
    };

    const errorHandler = (e: Event) =>
      this.#mediaElementErrorCircuitBreaker.handleError(e);

    const seekedHandler = (e: Event) => {
      if (shouldIgnoreEvent(e)) {
        return;
      }
      this.currentTime = this.mediaElement ? this.mediaElement.currentTime : 0;
      this.seekEnd(this.currentTime);
    };

    this.#mediaElementEventHandlers = {
      durationChangeHandler,
      endedHandler,
      errorHandler,
      pauseHandler: setNotPlaying,
      playHandler: setPlaying,
      playingHandler: setPlaying,
      seekedHandler,
      stalledHandler: setStalled,
      timeUpdateHandler,
      waitingHandler: setStalled,
    };

    this.#shakaEventHandlers = {
      bufferingHandler: (event => {
        // Shaka Player emits buffering events with a custom 'buffering' property
        const bufferingEvent = event as Event & { buffering: boolean };
        if (bufferingEvent.buffering) {
          setStalled(event);
        } else if (this.hasStarted()) {
          setPlaying(event);
        }
      }) as EventListener,
      errorHandler: ((e: CustomEvent<shaka.extern.Error>) =>
        this.#handleShakaError(e)) as EventListener,
      loadedHandler: setNotPlaying,
      stallDetectedHandler: setStalled,
    };
  }

  #clearCrossfadeTimers() {
    if (this.#crossfadeStepTimerId != null) {
      clearTimeout(this.#crossfadeStepTimerId);
      this.#crossfadeStepTimerId = null;
    }
    if (this.#crossfadeDeadlineTimerId != null) {
      clearTimeout(this.#crossfadeDeadlineTimerId);
      this.#crossfadeDeadlineTimerId = null;
    }
    if (this.#crossfadeTriggerTimerId != null) {
      clearTimeout(this.#crossfadeTriggerTimerId);
      this.#crossfadeTriggerTimerId = null;
    }
  }

  #completeTransition(
    nextMediaElement: HTMLMediaElement,
    nextPayload: LoadPayload,
    transitionToken?: object,
  ) {
    // Token guard: if a token was supplied, the caller is a step / deadline
    // timer; ignore the call if the active transition has changed (cancelled,
    // restarted, or already completed by the racing timer).
    if (
      transitionToken !== undefined &&
      transitionToken !== this.#currentTransitionToken
    ) {
      return;
    }
    // Mark the transition as consumed so any later stale callback no-ops.
    this.#currentTransitionToken = undefined;
    this.#clearCrossfadeTimers();
    this.debugLog('Crossfade complete - swapping active player');

    // Finalize the OUTGOING (soon-to-be-inactive) session and stop its
    // background playback. Without this, the old media element keeps
    // decoding silently until its natural 'ended' event fires, which
    // accumulates across repeated transitions and can push CPU usage up
    // (and eventually crash the page) over many replays.
    const outgoingMediaElement = this.#getActiveMediaElement();
    const outgoingSessionId =
      this.#activePlayer === 1
        ? this.#playerOneSessionId
        : this.#playerTwoSessionId;

    if (outgoingSessionId) {
      const savedPlaybackState = this.playbackState;
      const savedCurrentSessionId = this.currentStreamingSessionId;
      this.currentTime = outgoingMediaElement.currentTime;
      this.currentStreamingSessionId = outgoingSessionId;
      this.finishCurrentMediaProduct('completed', true);
      this.currentStreamingSessionId = savedCurrentSessionId;
      this.playbackState = savedPlaybackState;

      if (this.#activePlayer === 1) {
        this.#playerOneSessionId = undefined;
      } else {
        this.#playerTwoSessionId = undefined;
      }
    }

    // Set volume to 0 BEFORE pausing so any residual buffered audio that
    // would otherwise be flushed out by pause() is silenced first. This
    // avoids a perceptible click at the end of the crossfade.
    outgoingMediaElement.volume = 0;
    try {
      outgoingMediaElement.pause();
    } catch {
      // Ignore pause errors -- best-effort cleanup
    }

    this.#activePlayer = this.#activePlayer === 1 ? 2 : 1;

    // CRITICAL: Reset currentTime IMMEDIATELY after swapping active player
    // to prevent race conditions with event handlers reading stale position.
    this.currentTime = nextMediaElement.currentTime;

    this.currentStreamingSessionId = nextPayload.streamInfo.streamingSessionId;
    this.preloadedStreamingSessionId = undefined;
    this.startAssetPosition = 0;

    // HTMLMediaElement.duration is NaN until metadata loads (and NaN is not
    // nullish, so ?? would propagate it through composePlaybackContext);
    // fall back to the streamInfo value when the element duration isn't
    // a finite number.
    const duration = Number.isFinite(nextMediaElement.duration)
      ? nextMediaElement.duration
      : (nextPayload.streamInfo.duration ?? 0);

    const assetPosition = nextMediaElement.currentTime;

    const playbackContext = composePlaybackContext({
      assetPosition,
      duration,
      playbackInfo: nextPayload.playbackInfo,
      streamInfo: nextPayload.streamInfo,
    });

    streamingSessionStore.saveMediaProductTransition(
      nextPayload.streamInfo.streamingSessionId,
      { mediaProduct: nextPayload.mediaProduct, playbackContext },
    );

    this.debugLog('Media product transition saved for track');

    events.dispatchEvent(
      mediaProductTransitionEvent(nextPayload.mediaProduct, playbackContext),
    );

    performance.mark(
      'streaming_metrics:playback_statistics:idealStartTimestamp',
      {
        detail: nextPayload.streamInfo.streamingSessionId,
        startTime: trueTime.now(),
      },
    );

    this.mediaProductStarted(nextPayload.streamInfo.streamingSessionId);

    this.debugLog(
      'Transition complete! Active player is now:',
      this.#activePlayer,
    );

    // #preloadReady / #preloadedPayload were already cleared at crossfade
    // start to short-circuit the "transition missed" fallback.
    this.#crossfadeInProgress = false;
  }

  async #configureDRM(player: shaka.Player) {
    if ('Cypress' in window) {
      return;
    }

    const supportResult = await shaka.Player.probeSupport();

    if (supportResult.drm['com.widevine.alpha']) {
      this.debugLog('Configuring widevine DRM.');

      player.configure({
        drm: {
          advanced: {
            'com.widevine.alpha': {
              audioRobustness: ['SW_SECURE_CRYPTO'],
              serverCertificate: serverCertificateWidevine,
              videoRobustness: ['SW_SECURE_CRYPTO'],
            },
          },
          servers: {
            'com.widevine.alpha': `https://api.tidal.com/v2/widevine`, // TODO: update DRM URLs from manifest response if changed
          },
        },
      });
      return;
    } else if (supportResult.drm['com.apple.fps.1_0']) {
      this.debugLog('Configuring fairplay DRM.');

      shaka.polyfill.PatchedMediaKeysApple.install();
      const serverCertificate = await FairplayDRM.loadServerCertificate();

      player.configure({
        drm: {
          advanced: {
            'com.apple.fps.1_0': {
              serverCertificate,
              serverCertificateUri: 'https://fp.fa.tidal.com/certificate',
            },
          },

          initDataTransform: shaka.drm.FairPlay.verimatrixInitDataTransform,
          servers: {
            'com.apple.fps.1_0': `https://fp.fa.tidal.com/license`,
          },
        },
      });
      return;
    }

    // No supported DRM system. We intentionally do not throw -- playback of
    // DRM-protected content will still fail at load() time with a clear Shaka
    // error, while non-protected content (e.g. preview clips) keeps working.
  }

  /**
   * Playback of media product type demo needed to be done with
   * useNativeHlsForFairPlay and preferNativeHls set to false, but
   * we don't support `demo` anymore.
   */
  async #configureHlsForPlayback(instance: shaka.Player | undefined) {
    const isFairPlaySupported = await shaka.drm.FairPlay.isFairPlaySupported();

    if (isFairPlaySupported && instance) {
      if (instance.getConfiguration().streaming.preferNativeHls !== true) {
        instance.configure('streaming.preferNativeHls', true);
      }

      if (
        instance.getConfiguration().streaming.useNativeHlsForFairPlay !== true
      ) {
        instance.configure('streaming.useNativeHlsForFairPlay', true);
      }

      // await instance.release();
      await instance.unload(true);
    }
  }

  async #createShakaPlayer(mediaEl: HTMLMediaElement, playerNumber: 1 | 2) {
    this.debugLog('createShakaPlayer', mediaEl);

    const player = new shaka.Player();

    await player.attach(mediaEl);

    registerStalls(mediaEl);
    registerAdaptations(
      player,
      () =>
        playerNumber === 1
          ? this.#playerOneSessionId
          : this.#playerTwoSessionId,
      () => this.#activePlayer === playerNumber,
    );

    const isFairPlaySupported = await shaka.drm.FairPlay.isFairPlaySupported();

    // Re-used between streaming, drm and manifest configs below.
    const retryParameters = {
      backoffFactor: 2, // the multiplicative backoff factor between retries
      baseDelay: 1000, // the base delay in ms between retries
      fuzzFactor: 0.5, // the fuzz factor to apply to each retry delay
      maxAttempts: 5, // the maximum number of requests before we fail
      timeout: 5000, // timeout in ms, after which we abort; 0 means never
    };

    player.configure({
      abr: {
        enabled: true,
      },
      drm: {
        retryParameters,
      },
      manifest: {
        defaultPresentationDelay: 0,
        disableText: true,
        disableThumbnails: true,
        retryParameters,
      },
      streaming: {
        bufferBehind: 40,

        // The number of seconds of content that the StreamingEngine will attempt to buffer ahead of the playhead. This value must be greater than or equal to the rebuffering goal.
        bufferingGoal: 40,

        preferNativeHls: isFairPlaySupported,

        // The number of seconds of content that the StreamingEngine will attempt to buffer behind of the playhead.
        retryParameters,
        /*
         * Resume can be handled automatic by Shaka, but has no callback
         * for triggering tracking events etc.
         */
        // failureCallback() {},

        useNativeHlsForFairPlay: isFairPlaySupported,
      },
    });

    try {
      await this.#configureDRM(player);
    } catch {
      this.finishCurrentMediaProduct('error');

      return;
    }

    player
      .getNetworkingEngine()
      ?.registerRequestFilter(async (type, request, context) => {
        if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
          // context.isPreload is only set when using player.preload() /
          // PreloadManager. We preload by calling load() on the inactive
          // Shaka instance directly, so detect preload by which player
          // owns this filter (the closure-captured playerNumber) vs the
          // currently active one. context.isPreload still wins if Shaka
          // sets it, in case we ever swap to the PreloadManager API.
          const isPreload =
            context?.isPreload ?? playerNumber !== this.#activePlayer;

          const streamingSessionId = isPreload
            ? (this.preloadedStreamingSessionId ??
              this.currentStreamingSessionId) // If we switch quickly from preload -> current.
            : this.currentStreamingSessionId;

          performance.mark(
            'streaming_metrics:drm_license_fetch:startTimestamp',
            {
              detail: streamingSessionId,
              startTime: trueTime.now(),
            },
          );

          // Ensure header is octet-stream for license requests
          request.headers['Content-Type'] = 'application/octet-stream';

          const { token } =
            await credentialsProviderStore.credentialsProvider.getCredentials();

          if (token) {
            request.headers.authorization = `Bearer ${token}`;
          }
        }
      });

    player
      .getNetworkingEngine()
      ?.registerResponseFilter((type, response, context) => {
        // Same preload detection as the request filter above -- context.isPreload
        // isn't set when we load() directly on the inactive Shaka instance.
        const isPreload =
          context?.isPreload ?? playerNumber !== this.#activePlayer;

        const streamingSessionId = isPreload
          ? (this.preloadedStreamingSessionId ?? this.currentStreamingSessionId)
          : this.currentStreamingSessionId;

        if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
          if (streamingSessionId) {
            performance.mark(
              'streaming_metrics:drm_license_fetch:endTimestamp',
              {
                detail: streamingSessionId,
                startTime: trueTime.now(),
              },
            );

            performance.measure('streaming_metrics:drm_license_fetch', {
              detail: streamingSessionId,
              end: 'streaming_metrics:drm_license_fetch:endTimestamp',
              start: 'streaming_metrics:drm_license_fetch:startTimestamp',
            });

            StreamingMetrics.playbackStatistics({
              cdm: responseURIToCDMType(response.uri),
              cdmVersion: null,
              streamingSessionId,
            });

            StreamingMetrics.commit([
              StreamingMetrics.drmLicenseFetch({
                endReason: 'COMPLETE',
                endTimestamp: trueTime.timestamp(
                  'streaming_metrics:drm_license_fetch:endTimestamp',
                ),
                errorCode: null,
                errorMessage: null,
                startTimestamp: trueTime.timestamp(
                  'streaming_metrics:drm_license_fetch:startTimestamp',
                ),
                streamingSessionId,
              }),
            ]).catch(console.error);

            performance.clearMarks(
              'streaming_metrics:drm_license_fetch:endTimestamp',
            );
            performance.clearMarks(
              'streaming_metrics:drm_license_fetch:startTimestamp',
            );
          }
        }
      });

    // Set up both Shaka player events and media element events
    this.#shakaEvents(player, true);
    this.#mediaElementEvents(mediaEl, true);

    return player;
  }

  #getTransitionConfig() {
    const crossfadeInMs = Config.get('crossfadeInMs');

    if (crossfadeInMs > 0) {
      return {
        crossfadeDurationMs: crossfadeInMs,
        startBeforeEndS: crossfadeInMs / 1000,
      };
    }

    return {
      crossfadeDurationMs: ShakaPlayer.#GAPLESS_CROSSFADE_MS,
      startBeforeEndS: ShakaPlayer.#GAPLESS_START_BEFORE_END_S,
    };
  }

  #handleShakaError(e: CustomEvent<shaka.extern.Error>) {
    if (this.#isReset) {
      return;
    }

    const isFromInactivePlayer =
      e.target instanceof shaka.Player &&
      e.target !== this.#getActiveShakaInstance();

    const error = e.detail;
    const errorCode = `S${error.code}` as ErrorCodes;

    switch (error.code) {
      case shaka.util.Error.Code.LICENSE_REQUEST_FAILED: // 6007
        if (this.currentStreamingSessionId) {
          StreamingMetrics.commit([
            StreamingMetrics.drmLicenseFetch({
              endReason: 'ERROR',
              endTimestamp: trueTime.timestamp(
                'streaming_metrics:drm_license_fetch:endTimestamp',
              ),
              errorCode,
              errorMessage: JSON.stringify(error),
              startTimestamp: trueTime.timestamp(
                'streaming_metrics:drm_license_fetch:startTimestamp',
              ),
              streamingSessionId: this.currentStreamingSessionId,
            }),
          ]).catch(console.error);
        }
        break;
      case shaka.util.Error.Code.LOAD_INTERRUPTED: // 7000
        return;
      case shaka.util.Error.Code.SRC_EQUALS_PRELOAD_NOT_SUPPORTED:
        return; // Ignore this error, handled via promise rejection.
      case shaka.util.Error.Code.TIMEOUT: // 1003
        console.warn('Shaka: TIMEOUT');
        console.warn('Shaka: URI', error.data[0]);
        console.warn('Shaka: RequestType', error.data[1]);
        break;
      default:
        break;
    }

    const isNetworkError = error.category === shaka.util.Error.Category.NETWORK;

    if (error.severity === shaka.util.Error.Severity.CRITICAL) {
      if (isFromInactivePlayer) {
        this.debugLog(
          'Critical error from inactive player, clearing preload:',
          errorCode,
        );
        // Use the shared teardown so preloadedStreamingSessionId, the stored
        // transition, and the inactive Shaka instance are all cleaned up. Just
        // clearing #preloadedPayload/#preloadReady would leave BasePlayer
        // believing a next item still exists.
        this.#preloadReady = false;
        this.unloadPreloadedMediaProduct().catch(console.error);

        events.dispatchError(
          new PlayerError(
            isNetworkError ? 'PENetwork' : 'EUnexpected',
            errorCode,
          ),
        );
        return;
      }

      this.playbackState = 'STALLED';

      if (this.mediaElement) {
        this.mediaElement.pause();
      }

      if (this.currentStreamingSessionId) {
        StreamingMetrics.playbackStatistics({
          errorCode,
          errorMessage: JSON.stringify(error),
          streamingSessionId: this.currentStreamingSessionId,
        });
      }

      events.dispatchError(
        new PlayerError(
          isNetworkError ? 'PENetwork' : 'EUnexpected',
          errorCode,
        ),
      );

      if (!isNetworkError) {
        this.finishCurrentMediaProduct('error');
      }
    }

    if (isNetworkError) {
      this.#shouldRetryStreaming = true;
    }
  }

  async #loadAndDispatchMediaProductTransition({
    assetPosition,
    assetUriOrPreloader,
    mediaProduct,
    playbackInfo,
    streamInfo,
  }: {
    assetPosition: number;

    assetUriOrPreloader: shaka.media.PreloadManager | string;
    mediaProduct: MediaProduct;
    playbackInfo: PlaybackInfo;
    streamInfo: StreamInfo;
  }) {
    this.debugLog('loadAndDispatchMediaProductTransition');
    this.currentTime = assetPosition;

    const shakaInstance = this.#getActiveShakaInstance();
    const mediaElement = this.#getActiveMediaElement();

    if (!shakaInstance || !mediaElement) {
      return;
    }

    // Keep explicit handler ref so we can remove this listener if load()
    // throws below -- otherwise { once: true } never fires and the listener
    // accumulates on the Shaka instance across repeated load failures.
    let resolvePlayerLoad!: () => void;
    const playerLoad = new Promise<void>(resolve => {
      resolvePlayerLoad = resolve;
    });
    const onShakaLoaded = () => resolvePlayerLoad();
    shakaInstance.addEventListener('loaded', onShakaLoaded, { once: true });

    this.debugLog(
      'Loading with',
      typeof assetUriOrPreloader === 'string' ? 'URL' : 'PreloadManager',
      'at position',
      assetPosition,
    );

    this.currentStreamingSessionId = playbackInfo.streamingSessionId;
    this.preloadedStreamingSessionId = undefined;

    // Track which session is on which player
    if (this.#activePlayer === 1) {
      this.#playerOneSessionId = playbackInfo.streamingSessionId;
    } else {
      this.#playerTwoSessionId = playbackInfo.streamingSessionId;
    }

    let playbackContext: PlaybackContext;

    // If there is a saved mediaProductTransition, use it instead of creating a new one.
    // This is the case when using setNext+load.
    const hasSavedTransition = streamingSessionStore.hasMediaProductTransition(
      playbackInfo.streamingSessionId,
    );

    if (hasSavedTransition) {
      const mediaProductTransition =
        streamingSessionStore.getMediaProductTransition(
          playbackInfo.streamingSessionId,
        )!;

      playbackContext = mediaProductTransition.playbackContext;
    } else {
      // Save a placeholder transition BEFORE load() to handle adaptation events
      const estimatedDuration = streamInfo.duration ?? 0;
      playbackContext = composePlaybackContext({
        assetPosition,
        duration: estimatedDuration,
        playbackInfo,
        streamInfo,
      });

      streamingSessionStore.saveMediaProductTransition(
        streamInfo.streamingSessionId,
        { mediaProduct, playbackContext },
      );
    }

    // Set up durationchange listener BEFORE load() to avoid missing the event.
    // AbortController lets us tear the listener down if load() throws.
    const durationChangeAbortController = new AbortController();
    let durationChangePromise: Promise<number> | undefined;
    if (!hasSavedTransition) {
      durationChangePromise = new Promise<number>(resolve =>
        mediaElement.addEventListener(
          'durationchange',
          e => {
            if (e.target instanceof HTMLMediaElement) {
              resolve(e.target.duration);
            }
          },
          { once: true, signal: durationChangeAbortController.signal },
        ),
      );
    }

    try {
      await shakaInstance.load(assetUriOrPreloader, assetPosition);
      this.debugLog('Load completed successfully');
    } catch (e) {
      const error = e as shaka.extern.Error;
      console.error('Load failed:', error);
      this.#handleShakaError(
        new CustomEvent<shaka.extern.Error>('shaka-error', { detail: error }),
      );
      // load() rejected, so 'loaded' / 'durationchange' will never fire.
      // Tear the {once:true} listeners down explicitly so they don't pile up
      // on the Shaka instance / media element across repeated load failures.
      shakaInstance.removeEventListener('loaded', onShakaLoaded);
      durationChangeAbortController.abort();
      // The load() rejection means streamInfo will never be played.
      // finishCurrentMediaProduct() in #handleShakaError no-ops here because
      // hasStarted() is false, so the placeholder mediaProductTransition and
      // saved streamInfo would otherwise leak in streamingSessionStore.
      streamingSessionStore.deleteSession(streamInfo.streamingSessionId);
      return;
    }

    if (durationChangePromise) {
      const duration = await durationChangePromise;

      playbackContext = composePlaybackContext({
        assetPosition,
        duration,
        playbackInfo,
        streamInfo,
      });

      streamingSessionStore.saveMediaProductTransition(
        streamInfo.streamingSessionId,
        { mediaProduct, playbackContext },
      );
    }

    await playerLoad;

    // Player was reset during load, do not continue.
    if (this.currentStreamingSessionId !== streamInfo.streamingSessionId) {
      return;
    }

    events.dispatchEvent(
      mediaProductTransitionEvent(mediaProduct, playbackContext),
    );
  }

  async #loadLibraries() {
    this.debugLog('loadLibraries');

    // Install built-in polyfills to patch browser incompatibilities
    shaka.polyfill.installAll();

    await ensureVideoElementsMounted();

    // Initialize both Shaka players for gapless playback
    // DRM and all events are configured automatically inside #createShakaPlayer()
    this.#shakaInstanceOne = await this.#createShakaPlayer(mediaElementOne, 1);
    this.#shakaInstanceTwo = await this.#createShakaPlayer(mediaElementTwo, 2);

    // Set volume to 0 for inactive player
    mediaElementTwo.volume = 0;

    this.debugLog('Both Shaka players initialized for gapless playback');
  }

  #mediaElementEvents(mediaElement: HTMLMediaElement, eventsEnabled: boolean) {
    this.debugLog(
      'mediaElementEvents',
      eventsEnabled ? 'adding to' : 'removing from',
      mediaElement,
    );

    const method = eventsEnabled ? 'addEventListener' : 'removeEventListener';

    mediaElement[method](
      'durationchange',
      this.#mediaElementEventHandlers.durationChangeHandler,
      {
        passive: true,
      },
    );
    mediaElement[method]('play', this.#mediaElementEventHandlers.playHandler, {
      passive: true,
    });
    mediaElement[method](
      'playing',
      this.#mediaElementEventHandlers.playingHandler,
      { passive: true },
    );
    mediaElement[method](
      'timeupdate',
      this.#mediaElementEventHandlers.timeUpdateHandler,
      { passive: true },
    );
    mediaElement[method](
      'pause',
      this.#mediaElementEventHandlers.pauseHandler,
      { passive: true },
    );
    mediaElement[method](
      'ended',
      this.#mediaElementEventHandlers.endedHandler,
      { passive: true },
    );
    mediaElement[method](
      'error',
      this.#mediaElementEventHandlers.errorHandler,
      { passive: true },
    );
    mediaElement[method](
      'waiting',
      this.#mediaElementEventHandlers.waitingHandler,
      { passive: true },
    );
    mediaElement[method](
      'stalled',
      this.#mediaElementEventHandlers.stalledHandler,
      { passive: true },
    );
    mediaElement[method](
      'seeked',
      this.#mediaElementEventHandlers.seekedHandler,
      { passive: true },
    );
  }

  #scheduleCrossfadeTrigger() {
    if (this.#crossfadeTriggerTimerId != null) {
      clearTimeout(this.#crossfadeTriggerTimerId);
      this.#crossfadeTriggerTimerId = null;
    }

    const activeMediaElement = this.#getActiveMediaElement();
    const duration = activeMediaElement.duration;

    if (!Number.isFinite(duration) || duration <= 0) {
      this.debugLog('scheduleCrossfadeTrigger: invalid duration, skipping');
      return;
    }

    const playbackRate = activeMediaElement.playbackRate || 1;
    const remainingS = duration - activeMediaElement.currentTime;
    const { startBeforeEndS } = this.#getTransitionConfig();
    const delayMs = ((remainingS - startBeforeEndS) * 1000) / playbackRate;

    if (delayMs <= 0) {
      // Already inside (or past) the trigger window -- fire immediately so we
      // don't truncate audible audio off the outgoing track. Firing early
      // (e.g. with delayMs = 800ms) would pause the outgoing element ~800ms
      // before its natural end, cutting off audible audio.
      // Skip when paused: starting the transition here would resume audio
      // even though the user is paused. timeUpdateHandler will pick it up
      // when the user resumes (it fires at ~4Hz once playing).
      if (activeMediaElement.paused) {
        this.debugLog(
          'scheduleCrossfadeTrigger: inside trigger window but paused -- deferring to timeUpdateHandler',
        );
        return;
      }
      this.debugLog(
        'scheduleCrossfadeTrigger: inside trigger window -- firing now',
      );
      this.#startTransition().catch(console.error);
      return;
    }

    this.#crossfadeTriggerTimerId = setTimeout(() => {
      this.#crossfadeTriggerTimerId = null;

      // Re-check timing: the user may have seeked backward (or paused for a
      // long time, or lowered playbackRate) since we scheduled this timer,
      // in which case starting now would pause the outgoing element before
      // its natural end and truncate audible audio. Re-arm by recursing into
      // #scheduleCrossfadeTrigger(), which recomputes delayMs from the
      // current duration / currentTime / playbackRate. This is self-correcting
      // when paused (we'd just keep deferring with progressively similar
      // delays until the user resumes and currentTime advances).
      // Re-read startBeforeEndS too -- the public API may change crossfadeInMs
      // (and therefore the trigger window) after we armed the timer.
      const { startBeforeEndS: currentStartBeforeEndS } =
        this.#getTransitionConfig();
      const currentRemaining =
        activeMediaElement.duration - activeMediaElement.currentTime;
      const currentDelayMs =
        ((currentRemaining - currentStartBeforeEndS) * 1000) /
        (activeMediaElement.playbackRate || 1);

      if (currentDelayMs > 0) {
        // Stop rescheduling if preload has been torn down (load(),
        // unloadPreloadedMediaProduct(), failed transition, ...) or if a
        // transition is already underway. Otherwise the recursion would keep
        // scheduling timers for the rest of the track even though there is
        // no next item.
        if (
          !this.#preloadReady ||
          !this.#preloadedPayload ||
          this.#crossfadeInProgress
        ) {
          this.debugLog(
            'scheduleCrossfadeTrigger: preload no longer valid -- not rescheduling',
          );
          return;
        }
        this.debugLog(
          'scheduleCrossfadeTrigger: no longer inside trigger window -- rescheduling',
        );
        this.#scheduleCrossfadeTrigger();
        return;
      }

      // Re-validate state: preload could have been cleared, user might have
      // paused/seeked, or a manual skip already swapped active player.
      if (
        this.#preloadReady &&
        this.#preloadedPayload &&
        !this.#crossfadeInProgress &&
        !activeMediaElement.paused &&
        activeMediaElement === this.#getActiveMediaElement()
      ) {
        this.#startTransition().catch(console.error);
      } else {
        this.debugLog('scheduleCrossfadeTrigger: guards failed, NOT starting');
      }
    }, delayMs);
  }

  #shakaEvents(shakaPlayer: shaka.Player, eventsEnabled: boolean) {
    this.debugLog('shakaEvents');

    const method = eventsEnabled ? 'addEventListener' : 'removeEventListener';

    shakaPlayer[method]('error', this.#shakaEventHandlers.errorHandler, false);
    shakaPlayer[method](
      'buffering',
      this.#shakaEventHandlers.bufferingHandler,
      false,
    );
    shakaPlayer[method](
      'stalldetected',
      this.#shakaEventHandlers.stallDetectedHandler,
      false,
    );
    shakaPlayer[method](
      'loaded',
      this.#shakaEventHandlers.loadedHandler,
      false,
    );
  }

  async #startCrossfadeTransition(durationMs: number) {
    this.debugLog(`Starting crossfade transition (${durationMs}ms)`);

    const currentMediaElement = this.#getActiveMediaElement();
    const nextMediaElement = this.#getInactiveMediaElement();
    const nextPayload = this.#preloadedPayload!;

    // Mark "no longer preloaded" up-front so that if anything (e.g. the SDK
    // 'ended' fallback in playbackEngineEndedHandler) fires while we're in
    // the middle of the crossfade, it cannot decide that "the transition was
    // missed" and trigger a SECOND crossfade in parallel with this one.
    // The original payload is captured in `nextPayload` above and used by
    // #completeTransition; clearing the fields here is purely defensive.
    this.#preloadReady = false;
    this.#preloadedPayload = null;
    const transitionToken = {};
    this.#currentTransitionToken = transitionToken;

    let currentTrackVolume: number;
    let nextTrackTargetVolume: number;

    try {
      currentTrackVolume = currentMediaElement.volume;
      nextTrackTargetVolume = this.adjustedVolume(nextPayload.streamInfo);

      nextMediaElement.currentTime = 0;
      // Start from a tiny non-zero volume. Chrome can delay starting a second
      // video element that is exactly silent; the first fade step below will
      // immediately set the calculated curve volume.
      nextMediaElement.volume = 0.001;
      await nextMediaElement.play();
      nextMediaElement.volume = 0;
    } catch (error) {
      this.debugLog('Error while starting crossfade', error);
      try {
        nextMediaElement.pause();
      } catch {
        // Ignore secondary errors during cleanup
      }
      this.#clearCrossfadeTimers();
      this.#crossfadeInProgress = false;
      this.#currentTransitionToken = undefined;
      // #preloadReady / #preloadedPayload were cleared up-front but
      // preloadedStreamingSessionId and the inactive Shaka instance still
      // hold the loaded content. Tear it all down so the player doesn't
      // end up with preloadedStreamingSessionId set but no payload --
      // skipToPreloadedMediaProduct() would reject "Preloaded payload not
      // found." and BasePlayer would still think a next item exists.
      this.unloadPreloadedMediaProduct().catch(console.error);
      return;
    }

    const startTime = performance.now();
    // Step every ~16ms (≈60Hz). setTimeout in foreground tabs goes down to
    // ~4ms but ~16ms is plenty smooth for a volume ramp and conserves CPU.
    const stepMs = 16;

    // CRITICAL: drive this on setTimeout, NOT requestAnimationFrame.
    // requestAnimationFrame is aggressively throttled (down to ~0.25Hz) when
    // the tab loses focus or the page is partially obscured -- which made a
    // 250ms crossfade stretch to 4+ seconds in practice and corrupted state
    // (track ended naturally during the stall, fallback paths fired, page
    // eventually crashed). setTimeout is throttled less aggressively (1Hz
    // when tab is backgrounded) and -- combined with the deadline below --
    // guarantees the swap completes in bounded time.
    const performCrossfadeStep = () => {
      if (this.#currentTransitionToken !== transitionToken) {
        return;
      }
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1.0);

      // Equal-power crossfade curve for constant perceived loudness.
      const fadeOutCurve = Math.cos((progress * Math.PI) / 2);
      const fadeInCurve = Math.sin((progress * Math.PI) / 2);

      currentMediaElement.volume = Math.max(
        0,
        Math.min(1, currentTrackVolume * fadeOutCurve),
      );
      nextMediaElement.volume = Math.max(
        0,
        Math.min(1, nextTrackTargetVolume * fadeInCurve),
      );

      if (progress < 1.0) {
        this.#crossfadeStepTimerId = setTimeout(performCrossfadeStep, stepMs);
      } else {
        this.#completeTransition(
          nextMediaElement,
          nextPayload,
          transitionToken,
        );
      }
    };

    // Hard deadline: even if step callbacks are throttled, swap no later
    // than `durationMs + 200ms` past start. #completeTransition is guarded
    // by the transition token so it's safe to race the step timer.
    this.#crossfadeDeadlineTimerId = setTimeout(() => {
      if (this.#currentTransitionToken !== transitionToken) {
        return;
      }
      this.debugLog('Crossfade hit hard deadline -- forcing completion');
      currentMediaElement.volume = 0;
      nextMediaElement.volume = nextTrackTargetVolume;
      this.#completeTransition(nextMediaElement, nextPayload, transitionToken);
    }, durationMs + 200);

    performCrossfadeStep();
  }

  async #startInstantTransition() {
    this.debugLog('Starting instant transition (no fade)');
    const nextMediaElement = this.#getInactiveMediaElement();
    const nextPayload = this.#preloadedPayload!;

    this.#preloadReady = false;
    this.#preloadedPayload = null;
    const transitionToken = {};
    this.#currentTransitionToken = transitionToken;

    const nextTrackTargetVolume = this.adjustedVolume(nextPayload.streamInfo);

    try {
      nextMediaElement.currentTime = 0;
      nextMediaElement.volume = nextTrackTargetVolume;
      await nextMediaElement.play();
    } catch (error) {
      this.debugLog('Error while starting instant transition', error);
      this.#crossfadeInProgress = false;
      this.#currentTransitionToken = undefined;
      // Same invariant as #startCrossfadeTransition's catch: tear down
      // preloadedStreamingSessionId and the inactive Shaka instance so we
      // don't leave the player thinking a next item exists with no payload.
      this.unloadPreloadedMediaProduct().catch(console.error);
      return;
    }

    if (this.#currentTransitionToken === transitionToken) {
      this.#completeTransition(nextMediaElement, nextPayload, transitionToken);
    }
  }

  async #startTransition({ instant = false }: { instant?: boolean } = {}) {
    if (
      this.#crossfadeInProgress ||
      !this.#preloadedPayload ||
      !this.#preloadReady
    ) {
      return;
    }

    this.#crossfadeInProgress = true;

    if (instant) {
      // Old track already silent (e.g. natural end fired before our timeupdate
      // trigger window). Skip the volume ramp -- it would just add a quiet
      // intro to the new track on top of the already-elapsed silence.
      await this.#startInstantTransition();
      return;
    }

    const { crossfadeDurationMs } = this.#getTransitionConfig();

    // Clamp the effective fade duration to the time actually left on the
    // outgoing track. If we triggered late (timeUpdateHandler fires at ~4Hz
    // so we can be up to ~250ms past the planned trigger window), or the
    // user seeked very close to the end, or the track is shorter than the
    // configured crossfade, run a shorter fade so the next track reaches
    // its target volume before the outgoing element naturally ends.
    // crossfadeDurationMs is wall-clock; remaining media-time must be divided
    // by playbackRate to compare apples to apples (at 2x, half the wall-clock
    // remaining as media-time would suggest).
    // Math.max(1, ...) avoids a divide-by-zero in performCrossfadeStep.
    const activeMediaElement = this.#getActiveMediaElement();
    const playbackRate = activeMediaElement.playbackRate || 1;
    const remainingMs = Math.max(
      0,
      ((activeMediaElement.duration - activeMediaElement.currentTime) * 1000) /
        playbackRate,
    );
    const effectiveDurationMs = Math.max(
      1,
      Math.min(crossfadeDurationMs, remainingMs),
    );
    await this.#startCrossfadeTransition(effectiveDurationMs);
  }

  async #waitForPreloadedMediaElementReady(mediaElement: HTMLMediaElement) {
    if (mediaElement.readyState > HTMLMediaElement.HAVE_NOTHING) {
      return true;
    }

    return new Promise<boolean>(resolve => {
      let resolved = false;
      const cleanup = () => {
        mediaElement.removeEventListener('loadedmetadata', resolveReady);
        mediaElement.removeEventListener('loadeddata', resolveReady);
        mediaElement.removeEventListener('canplay', resolveReady);
        clearTimeout(timeoutId);
      };
      const done = (isReady: boolean) => {
        if (resolved) {
          return;
        }
        resolved = true;
        cleanup();
        resolve(isReady);
      };
      const resolveReady = () => done(true);
      const timeoutId = setTimeout(() => done(false), 1000);

      mediaElement.addEventListener('loadedmetadata', resolveReady, {
        once: true,
      });
      mediaElement.addEventListener('loadeddata', resolveReady, { once: true });
      mediaElement.addEventListener('canplay', resolveReady, { once: true });
    });
  }

  // Dual player helper methods. Private (`#`) so the dual-player internals
  // aren't part of the supported public API surface.
  #getActiveMediaElement(): HTMLMediaElement {
    return this.#activePlayer === 1 ? mediaElementOne : mediaElementTwo;
  }

  #getActiveShakaInstance(): shaka.Player | undefined {
    return this.#activePlayer === 1
      ? this.#shakaInstanceOne
      : this.#shakaInstanceTwo;
  }

  #getInactiveMediaElement(): HTMLMediaElement {
    return this.#activePlayer === 1 ? mediaElementTwo : mediaElementOne;
  }

  #getInactiveShakaInstance(): shaka.Player | undefined {
    return this.#activePlayer === 1
      ? this.#shakaInstanceTwo
      : this.#shakaInstanceOne;
  }

  getPosition() {
    return this.currentTime;
  }

  async load(payload: LoadPayload, transition: 'explicit' | 'implicit') {
    this.debugLog('load', payload);
    await this.ready;

    this.currentTime = payload.assetPosition;
    this.startAssetPosition = payload.assetPosition;

    // Ensure reset and set reset to false since we're loading anew.
    await this.reset();
    this.#isReset = false;

    await this.#configureHlsForPlayback(this.#getActiveShakaInstance());

    await ensureVideoElementsMounted();

    const { assetPosition, mediaProduct, playbackInfo, streamInfo } = payload;

    this.currentStreamingSessionId = streamInfo.streamingSessionId;

    if (transition === 'explicit') {
      this.playbackState = 'NOT_PLAYING';
    }

    const mediaElement = this.#getActiveMediaElement();
    const shakaInstance = this.#getActiveShakaInstance();

    if (!shakaInstance || !mediaElement) {
      return;
    }

    // Cancel any in-progress transition
    if (this.#crossfadeInProgress) {
      this.#crossfadeInProgress = false;
      this.#currentTransitionToken = undefined;
    }

    // Clear preloaded payload if loading a new track. #clearCrossfadeTimers()
    // also tears down a previously scheduled crossfade trigger -- otherwise
    // that timer would fire later, hit the rescheduling path in
    // #scheduleCrossfadeTrigger and keep re-arming itself for the rest of
    // the new track even though there is no next item anymore.
    this.#clearCrossfadeTimers();
    this.#preloadReady = false;
    this.#preloadedPayload = null;

    // Pause and reset inactive player
    const inactiveElement = this.#getInactiveMediaElement();
    inactiveElement.pause();
    inactiveElement.volume = 0;

    // Load the current track in the active player
    return this.#loadAndDispatchMediaProductTransition({
      assetPosition,
      assetUriOrPreloader: streamInfo.streamUrl,
      mediaProduct,
      playbackInfo,
      streamInfo,
    });
  }

  get mediaElement(): HTMLMediaElement | null {
    return this.#getActiveMediaElement();
  }

  async next(payload: LoadPayload) {
    this.debugLog('next', payload);

    const inactiveShakaInstance = this.#getInactiveShakaInstance();
    const inactiveMediaElement = this.#getInactiveMediaElement();

    if (!inactiveShakaInstance || !inactiveMediaElement) {
      console.warn('Inactive Shaka instance or media element not initialized.');
      return;
    }

    // Store preloaded payload for crossfade (but not yet ready for transition)
    this.#preloadReady = false;
    this.#preloadedPayload = payload;

    // Set preloaded session ID BEFORE loading to handle adaptation events
    this.preloadedStreamingSessionId = payload.streamInfo.streamingSessionId;

    // If the inactive player still holds a pending session (from a previous
    // track whose 'ended' event hasn't fired yet after a crossfade swap),
    // finalize it now before overwriting -- otherwise the ended event would
    // later finish the new (wrong) session id.
    const inactivePendingSessionId =
      this.#activePlayer === 1
        ? this.#playerTwoSessionId
        : this.#playerOneSessionId;

    if (inactivePendingSessionId) {
      this.debugLog(
        `Finalizing pending session ${inactivePendingSessionId} on inactive player before preload`,
      );
      const savedPlaybackState = this.playbackState;
      const savedCurrentSessionId = this.currentStreamingSessionId;
      const savedCurrentTime = this.currentTime;

      if (inactiveMediaElement.readyState > HTMLMediaElement.HAVE_NOTHING) {
        this.currentTime = inactiveMediaElement.currentTime;
      }
      this.currentStreamingSessionId = inactivePendingSessionId;
      this.finishCurrentMediaProduct('completed', true);

      this.currentStreamingSessionId = savedCurrentSessionId;
      this.playbackState = savedPlaybackState;
      this.currentTime = savedCurrentTime;
    }

    // Track which session is on which player
    if (this.#activePlayer === 1) {
      this.#playerTwoSessionId = payload.streamInfo.streamingSessionId;
    } else {
      this.#playerOneSessionId = payload.streamInfo.streamingSessionId;
    }

    // Save a placeholder media product transition BEFORE load()
    // This ensures it exists when Shaka fires adaptation events during load
    const estimatedDuration = payload.streamInfo.duration || 0;
    const initialPlaybackContext = composePlaybackContext({
      assetPosition: 0,
      duration: estimatedDuration,
      playbackInfo: payload.playbackInfo,
      streamInfo: payload.streamInfo,
    });

    streamingSessionStore.saveMediaProductTransition(
      payload.streamInfo.streamingSessionId,
      {
        mediaProduct: payload.mediaProduct,
        playbackContext: initialPlaybackContext,
      },
    );

    // Load next track in inactive player
    this.debugLog('Loading next track in inactive player');

    try {
      // Load into inactive player - Shaka will start buffering automatically
      await inactiveShakaInstance.load(payload.streamInfo.streamUrl);
      this.debugLog('Next track loaded in inactive player');

      // Set volume to 0 and position to 0
      // Keep the media element PAUSED - we'll play it during crossfade or when user skips
      inactiveMediaElement.volume = 0;
      if (inactiveMediaElement.currentTime !== 0) {
        inactiveMediaElement.currentTime = 0;
      }

      const isMediaElementReady =
        await this.#waitForPreloadedMediaElementReady(inactiveMediaElement);

      if (!isMediaElementReady) {
        throw new Error(
          `Preloaded media element did not become ready after Shaka load (readyState=${inactiveMediaElement.readyState})`,
        );
      }

      this.debugLog('Next track loaded and ready in inactive player');

      /*
        A play action can only start playback if playback state is not IDLE.
        If shaka is currently not playing anything and we preload to play something soon,
        we need to set playback state to NOT_PLAYING so we can start later.
      */
      if (this.playbackState === 'IDLE') {
        this.playbackState = 'NOT_PLAYING';
      }

      // Wait for duration to be available and update the saved transition
      if (
        !inactiveMediaElement.duration ||
        isNaN(inactiveMediaElement.duration)
      ) {
        await new Promise<void>(resolve => {
          inactiveMediaElement.addEventListener(
            'durationchange',
            () => resolve(),
            {
              once: true,
            },
          );
        });
      }

      // Update media product transition with actual duration
      const actualDuration =
        inactiveMediaElement.duration || payload.streamInfo.duration || 0;

      const finalPlaybackContext = composePlaybackContext({
        assetPosition: 0,
        duration: actualDuration,
        playbackInfo: payload.playbackInfo,
        streamInfo: payload.streamInfo,
      });

      streamingSessionStore.saveMediaProductTransition(
        payload.streamInfo.streamingSessionId,
        {
          mediaProduct: payload.mediaProduct,
          playbackContext: finalPlaybackContext,
        },
      );

      this.debugLog('Media product transition saved for next track');

      // Revalidate after the multiple awaits above: reset() (or a competing
      // next()/load()) may have cleared / overwritten preloadedStreamingSessionId
      // while we were loading. Without this guard, the continuation would
      // resurrect stale preload state (#preloadReady, #isReset) and re-arm the
      // crossfade trigger after a reset, leading to a transition pointing at
      // an unloaded inactive player.
      if (
        this.preloadedStreamingSessionId !==
        payload.streamInfo.streamingSessionId
      ) {
        this.debugLog(
          `next(): preload superseded during load (${payload.streamInfo.streamingSessionId} -> ${this.preloadedStreamingSessionId ?? 'none'}) -- not arming preload`,
        );
        return;
      }

      this.#preloadReady = true;
      this.#isReset = false;

      // Schedule the crossfade trigger explicitly based on the active
      // track's remaining duration, instead of relying solely on timeupdate.
      // timeupdate fires at ~4Hz so a 250ms trigger window can be missed
      // entirely (especially when the main thread is busy from preload work
      // or buffering). A precise setTimeout makes the trigger reliable.
      this.#scheduleCrossfadeTrigger();
    } catch (error) {
      console.error('Failed to load next track:', error);

      try {
        await inactiveShakaInstance.unload(/* initializeMediaSource */ true);
      } catch {
        // Best-effort cleanup after failed preload
      }

      // Clear all preload state to maintain consistency. cleanUpStoredPreloadInfo()
      // also deletes the placeholder mediaProductTransition / streamInfo /
      // playbackInfo from streamingSessionStore (saved by setNext + the
      // pre-load placeholder write above), preventing repeated preload failures
      // from leaking session entries.
      this.#preloadReady = false;
      this.#preloadedPayload = null;
      this.cleanUpStoredPreloadInfo();

      // Clear the player session ID that was set for the failed load
      if (this.#activePlayer === 1) {
        this.#playerTwoSessionId = undefined;
      } else {
        this.#playerOneSessionId = undefined;
      }
    }
  }

  pause() {
    this.debugLog('pause');

    if (this.mediaElement) {
      this.mediaElement.pause();
    }
  }

  async play() {
    this.debugLog('play');

    await this.maybeHardReload();

    // Handle 100 % data loss w NLC
    if (this.#shouldRetryStreaming) {
      const retrySuccessful = this.#getActiveShakaInstance()?.retryStreaming();

      this.#shouldRetryStreaming = !retrySuccessful;

      if (!retrySuccessful) {
        this.playbackState = 'NOT_PLAYING';
        this.finishCurrentMediaProduct('error');

        return;
      }
    }

    if (this.playbackState === 'IDLE') {
      this.debugLog('is IDLE, returning early');

      return Promise.resolve();
    }

    // Check if setSinkId is supported (both elements are created the same way, so checking one is sufficient)
    const activeElement = this.#getActiveMediaElement();
    if (activeElement && 'setSinkId' in activeElement) {
      await this.updateOutputDevice();
    }

    this.mediaProductStarted(this.currentStreamingSessionId);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.setStateToXIfNotYInZMs(1000, 'PLAYING', 'STALLED');

    await this.mediaElement?.play();

    const activeTrack = this.#getActiveShakaInstance()
      ?.getVariantTracks()
      ?.find((v: shaka.extern.Track) => v.active);

    // Ensure playback quality is updated when playback starts (for ABR streaming).
    updatePlaybackQuality(this.currentStreamingSessionId, activeTrack);
  }

  async playbackEngineEndedHandler(e: EndedEvent) {
    if (this.isActivePlayer) {
      const { reason } = e.detail;

      if (reason === 'completed') {
        // With dual player crossfade, the transition should already be complete
        // by the time the 'ended' event fires. Note: for seamless transitions
        // (gapless AND crossfade), the 'ended' custom event is suppressed
        // entirely (isSeamlessTransition=true in #mediaProductEnded), so this
        // handler only runs for non-seamless endings (e.g. natural end with no
        // preload, or skip).
        this.debugLog('Track ended - checking for next item');

        // Check if we have next track loaded but crossfade didn't trigger
        // (edge case: very short track, or seeking to end)
        if (
          this.#preloadedPayload &&
          this.#preloadReady &&
          !this.#crossfadeInProgress
        ) {
          this.debugLog('Transition missed - swapping immediately');
          await this.#startTransition({ instant: true });
        } else if (this.#preloadReady && this.hasNextItem()) {
          // Fallback for non-gapless next item
          await this.skipToPreloadedMediaProduct();
          await this.play();
        } else {
          if (playerState.preloadedStreamingSessionId) {
            this.debugLog(
              `Switching player from ${this.name} to ${playerState.preloadPlayer?.name}`,
            );
          } else {
            this.debugLog('No next item queued.');
          }

          this.playbackState = 'NOT_PLAYING';
        }
      }
    }
  }

  get ready() {
    return this.#librariesLoad;
  }

  async reset(
    { keepPreload }: { keepPreload: boolean } = { keepPreload: false },
  ) {
    this.debugLog('reset');

    // Always re-arm the media element error circuit breaker, even if the
    // player is already in the reset state. Media element listeners stay
    // attached across resets, so the breaker can trip while idle; without
    // this, a subsequent load() (which calls reset()) would inherit the
    // tripped breaker and silently suppress real errors on fresh content.
    this.#mediaElementErrorCircuitBreaker.reset();

    if (this.#isReset) {
      return;
    }

    // Capture before unloadPreloadedMediaProduct() clears it -- we use this
    // below to skip the redundant inactive-player unload in the unload-loop.
    const hadPreloadToTearDown =
      !keepPreload && !!this.preloadedStreamingSessionId;

    if (!keepPreload) {
      await this.unloadPreloadedMediaProduct();
    }

    if (this.playbackState !== 'IDLE') {
      this.finishCurrentMediaProduct('skip');
    }

    this.playbackState = 'IDLE';

    this.detachPlaybackEngineEndedHandler();

    this.currentStreamingSessionId = undefined;

    if (!keepPreload) {
      this.preloadedStreamingSessionId = undefined;
      this.#preloadReady = false;
      this.#preloadedPayload = null;
    }

    // Cancel any in-progress transition
    if (this.#crossfadeInProgress) {
      this.#clearCrossfadeTimers();
      this.#crossfadeInProgress = false;
      this.#currentTransitionToken = undefined;
    }

    this.#isReset = true;

    // Reset players: always unload active player, unload inactive only if
    // !keepPreload AND unloadPreloadedMediaProduct() didn't already do it.
    const promises: Array<Promise<void>> = [];
    const activeShakaInstance = this.#getActiveShakaInstance();
    const inactiveShakaInstance = this.#getInactiveShakaInstance();

    // Always unload the active player
    if (activeShakaInstance) {
      promises.push(
        activeShakaInstance.unload(/* initializeMediaSource */ true),
      );
    }

    // Unload inactive player only if we're not keeping preload AND
    // unloadPreloadedMediaProduct() above didn't already unload it -- avoids
    // a redundant second unload in the common reset-with-preload case.
    if (!keepPreload && !hadPreloadToTearDown && inactiveShakaInstance) {
      promises.push(
        inactiveShakaInstance.unload(/* initializeMediaSource */ true),
      );
    }

    // Reset volumes and state only if not keeping preload
    if (!keepPreload) {
      mediaElementOne.volume = 1.0;
      mediaElementTwo.volume = 0;
      this.#activePlayer = 1;
      this.#playerOneSessionId = undefined;
      this.#playerTwoSessionId = undefined;
    } else {
      // When keeping preload, clear only the active player's session
      if (this.#activePlayer === 1) {
        this.#playerOneSessionId = undefined;
      } else {
        this.#playerTwoSessionId = undefined;
      }
    }

    await Promise.all(promises);
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  seek(currentTime: number) {
    this.debugLog('seek', currentTime);

    const { mediaElement } = this;

    if (!mediaElement) {
      this.debugLog('No media element available for seeking');
      return;
    }

    this.seekStart(this.currentTime);

    this.currentTime = currentTime;

    const seconds = currentTime;

    if ('fastSeek' in mediaElement) {
      mediaElement.fastSeek(seconds);
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Not never.
      mediaElement.currentTime = seconds;
    }

    return new Promise<number>(r => {
      mediaElement.addEventListener(
        'seeked',
        () => r(mediaElement.currentTime),
        { once: true },
      );
    });
  }

  async skipToPreloadedMediaProduct() {
    this.debugLog(
      'skipToPreloadedMediaProduct',
      this.preloadedStreamingSessionId,
    );

    if (!this.preloadedStreamingSessionId) {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      return Promise.reject('Nothing preloaded.');
    }

    const payload = this.#preloadedPayload;

    if (!payload) {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      return Promise.reject('Preloaded payload not found.');
    }

    // Pick up any overwriteMediaProduct updates (e.g. new referenceId from
    // an explicit load that matched the preloaded item).
    const mediaProductTransition =
      streamingSessionStore.getMediaProductTransition(
        this.preloadedStreamingSessionId,
      );

    if (mediaProductTransition) {
      payload.mediaProduct = mediaProductTransition.mediaProduct;
    }

    const inactiveMediaElement = this.#getInactiveMediaElement();

    // Pause the current (active) track and set its volume to 0.
    const activeMediaElement = this.#getActiveMediaElement();
    activeMediaElement.pause();
    activeMediaElement.volume = 0;

    // Ensure state allows a subsequent play() call (reset sets IDLE which
    // causes play() to return early).
    this.playbackState = 'NOT_PLAYING';

    // Clear preload state and any scheduled crossfade trigger up-front,
    // mirroring what #startCrossfadeTransition / #startInstantTransition do.
    // Otherwise timeupdate or playbackEngineEndedHandler could see the stale
    // #preloadReady/#preloadedPayload after the swap and try to transition
    // again -- this time pointing the inactive element at the just-swapped-out
    // (now active) track.
    this.#clearCrossfadeTimers();
    this.#preloadReady = false;
    this.#preloadedPayload = null;

    // Swap to the inactive player which already has the preloaded content.
    this.#completeTransition(inactiveMediaElement, payload);
  }

  togglePlayback() {
    this.debugLog('togglePlayback');
    const { mediaElement } = this;

    if (mediaElement) {
      if (mediaElement.paused) {
        mediaElement.play().catch(console.error);
      } else {
        mediaElement.pause();
      }
    }
  }

  async unloadPreloadedMediaProduct() {
    this.debugLog(
      'unloadPreloadedMediaProduct',
      this.preloadedStreamingSessionId,
    );

    if (!this.preloadedStreamingSessionId) {
      return;
    }

    this.cleanUpStoredPreloadInfo();

    // Clear all preload state together so #preloadReady doesn't end up true
    // while the payload is null (would rely on other guards downstream).
    // Also tear down any armed crossfade trigger -- it would otherwise fire
    // later and keep rescheduling itself even though the preload is gone.
    this.#clearCrossfadeTimers();
    this.#preloadedPayload = null;
    this.#preloadReady = false;

    // Unload inactive player if it has content
    const inactivePlayer = this.#getInactiveShakaInstance();
    const inactiveElement = this.#getInactiveMediaElement();

    if (inactivePlayer && inactiveElement.readyState !== 0) {
      await inactivePlayer.unload(/* initializeMediaSource */ false);
      inactiveElement.volume = 0;
    }
  }

  async updateOutputDevice() {
    if (!outputDevices) {
      return;
    }

    if (
      (outputDevices && !outputDevices.activeDevice) ||
      !Config.get('outputDevicesEnabled')
    ) {
      return Promise.resolve();
    }

    const sinkId = outputDevices.activeDevice.webDeviceId;

    if (!sinkId) {
      return;
    }

    // Browsers without setSinkId support (e.g. Safari) would otherwise throw
    // a TypeError on every device change. Both media elements are created the
    // same way, so checking one is sufficient.
    if (typeof mediaElementOne.setSinkId !== 'function') {
      return;
    }

    this.outputDeviceType = outputDevices.activeDevice.type;

    try {
      // Set sink ID on both media elements to ensure consistency across gapless transitions
      await Promise.all([
        mediaElementOne.setSinkId(sinkId),
        mediaElementTwo.setSinkId(sinkId),
      ]);

      events.dispatchEvent(
        activeDeviceChangedEvent(outputDevices.activeDevice.id),
      );
    } catch (e) {
      console.error(e);
    }
  }

  get volume() {
    return Config.get('desiredVolumeLevel');
  }

  set volume(newVolume: number) {
    this.debugLog('Setting volume to', newVolume);

    if (this.mediaElement) {
      this.mediaElement.volume = newVolume;
    }
  }
}
