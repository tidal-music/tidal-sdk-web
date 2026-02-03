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
  // Gapless crossfade settings (optimized values)
  readonly #CROSSFADE_DURATION_MS = 25;

  readonly #START_CROSSFADE_AT_SECONDS = 0.2;

  #activePlayer: 1 | 2 = 1;

  #crossfadeAnimationId: null | number = null;
  #crossfadeInProgress = false;

  #isReset = true;

  #librariesLoad: Promise<void>;

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

    credentialsProviderStore.addEventListener('authorized', () => {
      if (this.#shakaInstanceOne) {
        this.#configureDRM(this.#shakaInstanceOne).catch(console.error);
      }
      if (this.#shakaInstanceTwo) {
        this.#configureDRM(this.#shakaInstanceTwo).catch(console.error);
      }
    });

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
        return target !== this.getActiveMediaElement();
      } else if (target instanceof shaka.Player) {
        return target !== this.getActiveShakaInstance();
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
        this.mediaElement &&
        this.mediaElement.networkState === HTMLMediaElement.NETWORK_LOADING;

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
      const activeMediaElement = this.getActiveMediaElement();
      const isActiveElement = mediaElement === activeMediaElement;

      // Only update currentTime from active media element
      if (
        isActiveElement &&
        mediaElement.readyState > HTMLMediaElement.HAVE_NOTHING
      ) {
        this.currentTime = mediaElement.currentTime;
      }

      // Gapless crossfade logic
      if (isActiveElement && this.#preloadedPayload) {
        const timeRemaining = mediaElement.duration - mediaElement.currentTime;

        if (
          !this.#crossfadeInProgress &&
          timeRemaining <= this.#START_CROSSFADE_AT_SECONDS &&
          timeRemaining > 0
        ) {
          this.#startCrossfade().catch(console.error);
        }
      }
    };

    const durationChangeHandler = (e: Event) => {
      if (this.currentStreamingSessionId) {
        if (
          e.target instanceof HTMLMediaElement &&
          e.target === this.getActiveMediaElement()
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
        this.debugLog(
          `Ended event from player ${isPlayerOne ? 1 : 2} (session: ${sessionIdToFinish})`,
        );

        // Temporarily set currentStreamingSessionId to the ending session
        // so finishCurrentMediaProduct works correctly
        const savedCurrentSessionId = this.currentStreamingSessionId;
        this.currentStreamingSessionId = sessionIdToFinish;

        this.finishCurrentMediaProduct('completed');

        // Restore current session if it was different (gapless case)
        if (savedCurrentSessionId !== sessionIdToFinish) {
          this.currentStreamingSessionId = savedCurrentSessionId;
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
      console.error(
        'HTMLMediaElement errored',
        (e.target as HTMLMediaElement).error,
      );

    const seekedHandler = () => {
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

  async #configureDRM(player: shaka.Player) {
    const { clientId } =
      await credentialsProviderStore.credentialsProvider.getCredentials();

    if (!clientId) {
      return;
    }

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

          initDataTransform:
            shaka.util.FairPlayUtils.verimatrixInitDataTransform,
          servers: {
            'com.apple.fps.1_0': `https://fp.fa.tidal.com/license`,
          },
        },
      });
    } /* else {
      console.warn('No supported DRM system.');
      // eslint-disable-next-line no-console
      console.log(supportResult.drm);
    } */
  }

  /**
   * Playback of media product type demo needed to be done with
   * useNativeHlsForFairPlay and preferNativeHls set to false, but
   * we don't support `demo` anymore.
   */
  async #configureHlsForPlayback(instance: shaka.Player | undefined) {
    const isFairPlaySupported =
      await shaka.util.FairPlayUtils.isFairPlaySupported();

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

  async #createShakaPlayer(mediaEl: HTMLMediaElement) {
    this.debugLog('createShakaPlayer', mediaEl);

    const player = new shaka.Player();

    await player.attach(mediaEl);

    registerStalls(mediaEl);
    registerAdaptations(player, () => ({
      current: this.currentStreamingSessionId,
      preloaded: this.preloadedStreamingSessionId,
    }));

    const isFairPlaySupported =
      await shaka.util.FairPlayUtils.isFairPlaySupported();

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
          const isPreload = context?.isPreload ?? false;

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
        const isPreload = context?.isPreload;

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

  #handleShakaError(e: CustomEvent<shaka.extern.Error>) {
    if (this.#isReset) {
      return;
    }

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

    const shakaInstance = this.getActiveShakaInstance();
    const mediaElement = this.getActiveMediaElement();

    if (!shakaInstance || !mediaElement) {
      return;
    }

    const playerLoad = new Promise<void>(resolve => {
      shakaInstance.addEventListener(
        'loaded',
        () => {
          resolve();
        },
        { once: true },
      );
    });

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

    shakaInstance
      .load(assetUriOrPreloader, assetPosition)
      .then(() => {
        this.debugLog('Load completed successfully');
      })
      .catch((e: shaka.extern.Error) => {
        console.error('Load failed:', e);
        this.#handleShakaError(
          new CustomEvent<shaka.extern.Error>('shaka-error', { detail: e }),
        );
      });

    // If we didn't have a saved transition, wait for actual duration and update
    if (!hasSavedTransition) {
      const duration = await new Promise<number>(resolve =>
        mediaElement.addEventListener(
          'durationchange',
          e => {
            if (e.target instanceof HTMLMediaElement) {
              resolve(e.target.duration);
            }
          },
          { once: true },
        ),
      );

      // Update with actual duration
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
    this.#shakaInstanceOne = await this.#createShakaPlayer(mediaElementOne);
    this.#shakaInstanceTwo = await this.#createShakaPlayer(mediaElementTwo);

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

  async #startCrossfade() {
    if (this.#crossfadeInProgress || !this.#preloadedPayload) {
      return;
    }

    this.#crossfadeInProgress = true;
    this.debugLog('Starting gapless crossfade');

    const currentMediaElement = this.getActiveMediaElement();
    const nextMediaElement = this.getInactiveMediaElement();
    const nextPayload = this.#preloadedPayload;

    // Ensure next media element is at position 0
    nextMediaElement.currentTime = 0;

    // Start playing the second track NOW (at volume 0)
    await nextMediaElement.play();
    this.debugLog('Second track started playing for crossfade');

    const startTime = performance.now();

    const performCrossfade = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / this.#CROSSFADE_DURATION_MS, 1.0);

      // Equal-power crossfade for constant loudness
      const fadeOut = Math.cos((progress * Math.PI) / 2);
      const fadeIn = Math.sin((progress * Math.PI) / 2);

      currentMediaElement.volume = fadeOut;
      nextMediaElement.volume = fadeIn;

      if (progress < 1.0) {
        this.#crossfadeAnimationId = requestAnimationFrame(performCrossfade);
      } else {
        // Crossfade complete
        this.debugLog('Crossfade complete - swapping active player');

        // Don't pause old player - let it naturally reach the end and fire 'ended' event
        // Keep volume at 0 to avoid distortion (volume will be reset when this player is reused)

        // Swap active player
        this.#activePlayer = this.#activePlayer === 1 ? 2 : 1;

        // Update streaming session
        this.currentStreamingSessionId =
          nextPayload.streamInfo.streamingSessionId;
        this.preloadedStreamingSessionId = undefined;

        // Get duration from the now-active media element
        const duration =
          nextMediaElement.duration || nextPayload.streamInfo.duration || 0;

        // Compose playback context for the new track
        const playbackContext = composePlaybackContext({
          assetPosition: 0,
          duration,
          playbackInfo: nextPayload.playbackInfo,
          streamInfo: nextPayload.streamInfo,
        });

        // Save media product transition
        streamingSessionStore.saveMediaProductTransition(
          nextPayload.streamInfo.streamingSessionId,
          {
            mediaProduct: nextPayload.mediaProduct,
            playbackContext,
          },
        );

        this.debugLog('Media product transition saved for gapless track');

        // Dispatch media product transition event
        events.dispatchEvent(
          mediaProductTransitionEvent(
            nextPayload.mediaProduct,
            playbackContext,
          ),
        );

        // For gapless: Set the ideal start timestamp mark before calling mediaProductStarted
        // Normally this would be set by #mediaProductEnded, but with gapless the crossfade
        // happens before the first track ends
        performance.mark(
          'streaming_metrics:playback_statistics:idealStartTimestamp',
          {
            detail: nextPayload.streamInfo.streamingSessionId,
            startTime: trueTime.now(),
          },
        );

        // Mark the new track as started for analytics/reporting
        this.mediaProductStarted(nextPayload.streamInfo.streamingSessionId);

        this.debugLog(
          'Gapless transition complete! Active player is now:',
          this.#activePlayer,
        );

        // Clear preloaded payload
        this.#preloadedPayload = null;
        this.#crossfadeInProgress = false;
        this.#crossfadeAnimationId = null;
      }
    };

    this.#crossfadeAnimationId = requestAnimationFrame(performCrossfade);
  }

  // Dual player helper methods
  getActiveMediaElement(): HTMLMediaElement {
    return this.#activePlayer === 1 ? mediaElementOne : mediaElementTwo;
  }

  getActiveShakaInstance(): shaka.Player | undefined {
    return this.#activePlayer === 1
      ? this.#shakaInstanceOne
      : this.#shakaInstanceTwo;
  }

  getInactiveMediaElement(): HTMLMediaElement {
    return this.#activePlayer === 1 ? mediaElementTwo : mediaElementOne;
  }

  getInactiveShakaInstance(): shaka.Player | undefined {
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

    await this.#configureHlsForPlayback(this.getActiveShakaInstance());

    await ensureVideoElementsMounted();

    const { assetPosition, mediaProduct, playbackInfo, streamInfo } = payload;

    this.currentStreamingSessionId = streamInfo.streamingSessionId;

    if (transition === 'explicit') {
      this.playbackState = 'NOT_PLAYING';
    }

    const mediaElement = this.getActiveMediaElement();
    const shakaInstance = this.getActiveShakaInstance();

    if (!shakaInstance || !mediaElement) {
      return;
    }

    // Cancel any in-progress crossfade
    if (this.#crossfadeInProgress && this.#crossfadeAnimationId) {
      cancelAnimationFrame(this.#crossfadeAnimationId);
      this.#crossfadeInProgress = false;
      this.#crossfadeAnimationId = null;
    }

    // Clear preloaded payload if loading a new track
    this.#preloadedPayload = null;

    // Pause and reset inactive player
    const inactiveElement = this.getInactiveMediaElement();
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

  async next(payload: LoadPayload) {
    this.debugLog('next', payload);

    const inactiveShakaInstance = this.getInactiveShakaInstance();
    const inactiveMediaElement = this.getInactiveMediaElement();

    if (!inactiveShakaInstance || !inactiveMediaElement) {
      console.warn('Inactive Shaka instance or media element not initialized.');
      return;
    }

    // Store preloaded payload for crossfade
    this.#preloadedPayload = payload;

    // Set preloaded session ID BEFORE loading to handle adaptation events
    this.preloadedStreamingSessionId = payload.streamInfo.streamingSessionId;

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
    this.debugLog(
      'Loading next track in inactive player:',
      payload.streamInfo.streamUrl,
    );

    try {
      // Load into inactive player
      await inactiveShakaInstance.load(payload.streamInfo.streamUrl);
      this.debugLog('Next track loaded in inactive player');

      // Set volume to 0 and position to 0, but keep PAUSED
      // We'll start playing it when crossfade begins
      inactiveMediaElement.volume = 0;
      inactiveMediaElement.currentTime = 0;

      // Preload by briefly playing then pausing to buffer content
      await inactiveMediaElement.play();
      inactiveMediaElement.pause();
      inactiveMediaElement.currentTime = 0;

      this.debugLog('Next track loaded and buffered in inactive player');

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

      this.#isReset = false;
    } catch (error) {
      console.error('Failed to load next track:', error);

      // Clear all preload state to maintain consistency
      this.#preloadedPayload = null;
      this.preloadedStreamingSessionId = undefined;

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
      const retrySuccessful = this.getActiveShakaInstance()?.retryStreaming();

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
    const activeElement = this.getActiveMediaElement();
    if (activeElement && 'setSinkId' in activeElement) {
      await this.updateOutputDevice();
    }

    this.mediaProductStarted(this.currentStreamingSessionId);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.setStateToXIfNotYInZMs(1000, 'PLAYING', 'STALLED');

    await this.mediaElement?.play();

    const activeTrack = this.getActiveShakaInstance()
      ?.getVariantTracks()
      ?.find((v: shaka.extern.Track) => v.active);

    // Ensure playback quality is updated when playback starts (for ABR streaming).
    updatePlaybackQuality(this.currentStreamingSessionId, activeTrack);
  }

  async playbackEngineEndedHandler(e: EndedEvent) {
    if (this.isActivePlayer) {
      const { mediaProduct, reason } = e.detail;

      if (reason === 'completed') {
        // In gapless mode, the ended event for the previous track fires AFTER
        // crossfade has already transitioned to the next track. Guard against
        // handling stale ended events that don't correspond to the currently
        // active media product.
        if (mediaProduct !== this.currentMediaProduct) {
          this.debugLog(
            'Ignoring ended event for non-active media product (already handled by crossfade)',
          );
          return;
        }

        // With dual player crossfade, the transition should already be complete
        // by the time the 'ended' event fires
        this.debugLog('Track ended - crossfade should have handled transition');

        // Check if we have next track loaded but crossfade didn't trigger
        // (edge case: very short track, or seeking to end)
        if (this.#preloadedPayload && !this.#crossfadeInProgress) {
          this.debugLog('Crossfade missed - triggering now');
          await this.#startCrossfade();
        } else if (this.hasNextItem()) {
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

  async reset(
    { keepPreload }: { keepPreload: boolean } = { keepPreload: false },
  ) {
    this.debugLog('reset');

    if (this.#isReset) {
      return;
    }

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
      this.#preloadedPayload = null;
    }

    // Cancel any in-progress crossfade
    if (this.#crossfadeInProgress && this.#crossfadeAnimationId) {
      cancelAnimationFrame(this.#crossfadeAnimationId);
      this.#crossfadeInProgress = false;
      this.#crossfadeAnimationId = null;
    }

    this.#isReset = true;

    // Reset both players
    const promises: Array<Promise<void>> = [];

    if (this.#shakaInstanceOne && mediaElementOne.readyState !== 0) {
      promises.push(
        this.#shakaInstanceOne.unload(/* initializeMediaSource */ true),
      );
    }

    if (this.#shakaInstanceTwo && mediaElementTwo.readyState !== 0) {
      promises.push(
        this.#shakaInstanceTwo.unload(/* initializeMediaSource */ true),
      );
    }

    // Reset volumes
    mediaElementOne.volume = 1.0;
    mediaElementTwo.volume = 0;

    // Reset active player to 1
    this.#activePlayer = 1;

    // Clear session tracking
    this.#playerOneSessionId = undefined;
    this.#playerTwoSessionId = undefined;

    await Promise.all(promises);

    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  seek(currentTime: number) {
    this.debugLog('seek', currentTime);

    const { mediaElement } = this;

    if (!mediaElement) {
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

    // Get the preloaded payload (loaded in inactive player for gapless)
    const payload = this.#preloadedPayload;

    if (!payload) {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      return Promise.reject('Preloaded payload not found.');
    }

    const {
      mediaProduct: mediaProductFromLoadPayload,
      playbackInfo,
      streamInfo,
    } = payload;

    const mediaProductTransition =
      streamingSessionStore.getMediaProductTransition(
        streamInfo.streamingSessionId,
      );

    const mediaProduct =
      mediaProductTransition?.mediaProduct ?? mediaProductFromLoadPayload;

    this.debugLog(
      'skipToPreloadedMediaProduct - fallback for non-gapless transition',
    );

    // Note: With dual player approach, gapless is handled by crossfade
    // This is a fallback for edge cases
    {
      console.warn(
        'Using fallback skipToPreloadedMediaProduct - crossfade should have handled this',
      );

      // Fall back to URL load if no PreloadManager
      return this.#loadAndDispatchMediaProductTransition({
        assetPosition: 0,
        assetUriOrPreloader: streamInfo.streamUrl,
        mediaProduct,
        playbackInfo,
        streamInfo,
      });
    }
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

    // Clear preloaded payload
    this.#preloadedPayload = null;

    // Unload inactive player if it has content
    const inactivePlayer = this.getInactiveShakaInstance();
    const inactiveElement = this.getInactiveMediaElement();

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

  get mediaElement(): HTMLMediaElement | null {
    return this.getActiveMediaElement();
  }

  get ready() {
    return this.#librariesLoad;
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
