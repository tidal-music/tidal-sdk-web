import shaka from 'shaka-player';

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
import { waitFor } from '../internal/helpers/wait-for';
import type { OutputDevices } from '../internal/output-devices';
import { trueTime } from '../internal/true-time';

import { registerAdaptations } from './adaptations';
import {
  ensureVideoElementsMounted,
  mediaElementOne,
} from './audio-context-store';
import type { LoadPayload } from './basePlayer';
import { BasePlayer } from './basePlayer';
import * as FairplayDRM from './fairplay-drm';
import { manipulateLicenseRequest, manipulateLicenseResponse } from './filters';
import { registerStalls } from './stalls';
import { playerState } from './state';

let outputDevices: OutputDevices | undefined;

function responseURIToCDMType(uri: string) {
  const lastPath = uri.split('/').pop()?.split('?')[0];

  switch (lastPath) {
    case 'widevine':
      return 'WIDEVINE';
    case 'playready':
      return 'PLAY_READY';
    case 'fairplay':
      return 'FAIR_PLAY';
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

  #preloadManager: null | shaka.media.PreloadManager = null;
  #preloadedPayload: LoadPayload | null = null;

  #shakaEventHandlers: {
    bufferingHandler: EventListener;
    errorHandler: EventListener;
    loadedHandler: EventListener;
    stallDetectedHandler: EventListener;
  };

  #shouldRetryStreaming = false;

  name = 'shakaPlayer';

  shakaInstance: shaka.Player | undefined;

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
      if (this.shakaInstance) {
        this.#configureDRM(this.shakaInstance).catch(console.error);
      }
    });

    const setPlaying = () => {
      // Safari tend to send events wrongly. Verify the media event is actually playing before sending setting state.
      if (this.mediaElement && !this.mediaElement.paused) {
        this.playbackState = 'PLAYING';
      }
    };

    const setStalled = (e: Event) => {
      // Buffering event from shaka with this networkState is the real "waiting" event: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/waiting_event
      // "The waiting event is fired when playback has stopped because of a temporary lack of data."
      const shakaWaiting =
        e.type === 'buffering' &&
        this.mediaElement &&
        this.mediaElement.networkState === HTMLMediaElement.NETWORK_LOADING;

      // Safari tend to send events wrongly. Verify the media event is actually paused before sending setting state.
      if ((this.mediaElement && this.mediaElement.paused) || shakaWaiting) {
        this.playbackState = 'STALLED';
      }
    };

    const setNotPlaying = () => {
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

      if (mediaElement.readyState > HTMLMediaElement.HAVE_NOTHING) {
        this.currentTime = mediaElement.currentTime;
      }
    };

    const durationChangeHandler = (e: Event) => {
      if (this.currentStreamingSessionId) {
        if (e.target instanceof HTMLMediaElement) {
          streamingSessionStore.overwriteDuration(
            this.currentStreamingSessionId,
            e.target.duration,
          );
        }
      }
    };

    const endedHandler = (e: Event) => {
      timeUpdateHandler(e);
      this.finishCurrentMediaProduct('completed');
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
      bufferingHandler: event => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Custom shaka event
        if (event.buffering) {
          setStalled(event);
        } else if (this.hasStarted()) {
          setPlaying();
        }
      },
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

    const apiUrl = Config.get('apiUrl');

    const supportResult = await shaka.Player.probeSupport();

    if (supportResult.drm['com.widevine.alpha']) {
      this.debugLog('Configuring widevine DRM.');

      player.configure({
        drm: {
          advanced: {
            'com.widevine.alpha': {
              audioRobustness: 'SW_SECURE_CRYPTO',
              // VIZIO does not support inline cert. Will be fetched.
              serverCertificate:
                'VIZIO' in window ? undefined : serverCertificateWidevine,

              videoRobustness: 'SW_SECURE_CRYPTO',
            },
          },
          servers: {
            'com.widevine.alpha': `${apiUrl}/drm/licenses/widevine?token=${clientId}`,
          },
        },
      });
    } else if (supportResult.drm['com.microsoft.playready']) {
      this.debugLog('Configuring playready DRM.');

      player.configure({
        drm: {
          servers: {
            'com.microsoft.playready': `${apiUrl}/drm/licenses/playready?token=${clientId}`,
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
              serverCertificateUri:
                'https://resources.tidal.com/drm/fairplay/certificate',
            },
          },
          // eslint-disable-next-line @typescript-eslint/unbound-method
          initDataTransform:
            shaka.util.FairPlayUtils.verimatrixInitDataTransform,
          servers: {
            'com.apple.fps.1_0': `${apiUrl}/drm/licenses/fairplay?token=${clientId}`,
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
   * Playback of media product type demo needs to be done with
   * useNativeHlsForFairPlay and preferNativeHls set to false.
   */
  async #configureHlsForPlayback(
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    instance: shaka.Player | undefined,
    mediaProduct: MediaProduct,
  ) {
    const isFairPlaySupported =
      await shaka.util.FairPlayUtils.isFairPlaySupported();

    if (isFairPlaySupported && instance) {
      if (
        instance.getConfiguration().streaming.preferNativeHls !==
        (mediaProduct.productType !== 'demo')
      ) {
        instance.configure(
          'streaming.preferNativeHls',
          mediaProduct.productType !== 'demo',
        );
      }

      if (
        instance.getConfiguration().streaming.useNativeHlsForFairPlay !==
        (mediaProduct.productType !== 'demo')
      ) {
        instance.configure(
          'streaming.useNativeHlsForFairPlay',
          mediaProduct.productType !== 'demo',
        );
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
    registerAdaptations(player);

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
    } catch (e) {
      this.finishCurrentMediaProduct('error');

      return;
    }

    player
      .getNetworkingEngine()
      ?.registerRequestFilter(async (type, request, context) => {
        // Manipulate license requests
        if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
          const isPreload = context?.isPreload ?? false;

          const streamingSessionId = isPreload
            ? this.preloadedStreamingSessionId ?? this.currentStreamingSessionId // If we switch quickly from preload -> current.
            : this.currentStreamingSessionId;

          performance.mark(
            'streaming_metrics:drm_license_fetch:startTimestamp',
            {
              detail: streamingSessionId,
              startTime: trueTime.now(),
            },
          );

          const streamInfo =
            streamingSessionStore.getStreamInfo(streamingSessionId);

          if (streamingSessionId && streamInfo?.securityToken) {
            manipulateLicenseRequest(request, {
              securityToken: streamInfo.securityToken,
              streamingSessionId,
            });
          } else {
            console.error('Missing data for DRM request filter.');
          }
        }

        // Manipulate manifest and segment requests that are sent to
        // fsu.fa.tidal.com or ugcf.fa.tidal.com
        const isRequestToFsuOrUgcf =
          Array.isArray(request.uris) &&
          request.uris.find(
            uri =>
              uri.startsWith('https://fsu.fa.tidal.com') ||
              uri.startsWith('https://ugcf.fa.tidal.com'),
          );

        if (
          (type === shaka.net.NetworkingEngine.RequestType.MANIFEST ||
            type === shaka.net.NetworkingEngine.RequestType.SEGMENT) &&
          isRequestToFsuOrUgcf
        ) {
          const { token } =
            await credentialsProviderStore.credentialsProvider.getCredentials();

          request.headers.authorization = `Bearer ${token}`;
        }
      });

    player
      .getNetworkingEngine()
      ?.registerResponseFilter((type, response, context) => {
        const isPreload = context?.isPreload;

        const streamingSessionId = isPreload
          ? this.preloadedStreamingSessionId ?? this.currentStreamingSessionId
          : this.currentStreamingSessionId;

        // Manipulate license responses
        if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
          manipulateLicenseResponse(response);

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
              streamingSessionId: streamingSessionId,
            });

            StreamingMetrics.commit({
              events: [
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
                  streamingSessionId: streamingSessionId,
                }),
              ],
            }).catch(console.error);

            performance.clearMarks(
              'streaming_metrics:drm_license_fetch:endTimestamp',
            );
            performance.clearMarks(
              'streaming_metrics:drm_license_fetch:startTimestamp',
            );
          }
        }
      });

    this.#shakaEvents(player, true);
    this.#mediaElementEvents(mediaElementOne, true);

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
          StreamingMetrics.commit({
            events: [
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
            ],
          }).catch(console.error);
        }
        break;
      case shaka.util.Error.Code.LOAD_INTERRUPTED: // 7000
        return;
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
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    assetUriOrPreloader: shaka.media.PreloadManager | string;
    mediaProduct: MediaProduct;
    playbackInfo: PlaybackInfo;
    streamInfo: StreamInfo;
  }) {
    this.debugLog('loadAndDispatchMediaProductTransition');
    this.currentTime = assetPosition;

    const { shakaInstance } = this;

    if (!shakaInstance) {
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

    shakaInstance
      .load(assetUriOrPreloader, assetPosition)
      .catch((e: shaka.extern.Error) =>
        this.#handleShakaError(
          new CustomEvent<shaka.extern.Error>('shaka-error', { detail: e }),
        ),
      );

    this.currentStreamingSessionId = playbackInfo.streamingSessionId;
    this.preloadedStreamingSessionId = undefined;

    let playbackContext: PlaybackContext;

    // If there is a saved mediaProductTransition, use it instead of created a new one.
    // This is the case when using setNext+load.
    if (
      streamingSessionStore.hasMediaProductTransition(
        playbackInfo.streamingSessionId,
      )
    ) {
      const mediaProductTransition =
        streamingSessionStore.getMediaProductTransition(
          playbackInfo.streamingSessionId,
        )!;

      playbackContext = mediaProductTransition.playbackContext;
    } else {
      const duration = await new Promise<number>(resolve =>
        mediaElementOne.addEventListener(
          'durationchange',
          e => {
            if (e.target instanceof HTMLMediaElement) {
              resolve(e.target.duration);
            }
          },
          { once: true },
        ),
      );

      await playerLoad;

      // Player was reset during load, do not continue.
      if (this.currentStreamingSessionId !== streamInfo.streamingSessionId) {
        return;
      }

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

    this.debugLog('dispatching mediaProductTransition');
    events.dispatchEvent(
      mediaProductTransitionEvent(mediaProduct, playbackContext),
    );
  }

  async #loadLibraries() {
    this.debugLog('loadLibraries');

    // Install built-in polyfills to patch browser incompatibilities
    shaka.polyfill.installAll();

    await ensureVideoElementsMounted();

    this.shakaInstance = await this.#createShakaPlayer(mediaElementOne);
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

  getPosition() {
    return this.currentTime;
  }

  async load(payload: LoadPayload, transition: 'explicit' | 'implicit') {
    this.debugLog('load', payload);

    this.currentTime = payload.assetPosition;
    this.startAssetPosition = payload.assetPosition;

    await this.#configureHlsForPlayback(
      this.shakaInstance,
      payload.mediaProduct,
    );

    // Ensure reset and set reset to false since we're loading anew.
    await this.reset();
    this.#isReset = false;

    await this.ready;
    await ensureVideoElementsMounted();

    const { assetPosition, mediaProduct, playbackInfo, streamInfo } = payload;

    this.currentStreamingSessionId = streamInfo.streamingSessionId;

    if (transition === 'explicit') {
      this.playbackState = 'NOT_PLAYING';
    }

    const { mediaElement, shakaInstance } = this;

    if (!shakaInstance || !mediaElement) {
      return;
    }

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

    if (!this.shakaInstance) {
      console.warn('Shaka not initialized.');
      return;
    }

    /*
      A play action can only start playback if playback state is not IDLE.
      If shaka is currently not playing anything and we preload to play something soon,
      we need to set playback state to NOT_PLAYING so we can start later.
    */
    if (this.playbackState === 'IDLE') {
      this.playbackState = 'NOT_PLAYING';
    }

    this.preloadedStreamingSessionId = payload.streamInfo.streamingSessionId;

    this.#preloadManager = await this.shakaInstance.preload(
      payload.streamInfo.streamUrl,
    );

    // If we could parse duration from manifest, we can save the media product transition
    // and support "touch n go" playback. (re-using a preloaded item for a load)
    if (payload.streamInfo.duration) {
      const playbackContext = composePlaybackContext({
        assetPosition: 0,
        duration: payload.streamInfo.duration,
        playbackInfo: payload.playbackInfo,
        streamInfo: payload.streamInfo,
      });

      streamingSessionStore.saveMediaProductTransition(
        payload.streamInfo.streamingSessionId,
        {
          mediaProduct: payload.mediaProduct,
          playbackContext,
        },
      );
    }

    this.#preloadedPayload = payload;
    this.#isReset = false;
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
      const retrySuccessful = this.shakaInstance?.retryStreaming();

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

    if ('setSinkId' in mediaElementOne) {
      await this.updateOutputDevice();
    }

    this.mediaProductStarted(this.currentStreamingSessionId);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.setStateToXIfNotYInZMs(1000, 'PLAYING', 'STALLED');

    await this.mediaElement?.play();
  }

  async playbackEngineEndedHandler(e: EndedEvent) {
    if (this.isActivePlayer) {
      const { reason } = e.detail;

      if (reason === 'completed') {
        if (this.hasNextItem()) {
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
    }

    this.#isReset = true;

    const { mediaElement, shakaInstance: currentPlayer } = this;

    if (currentPlayer && mediaElement && mediaElement.readyState !== 0) {
      return currentPlayer.unload(/* initializeMediaSource */ true);
    }

    return;
  }

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

  // eslint-disable-next-line @typescript-eslint/require-await
  async skipToPreloadedMediaProduct() {
    this.debugLog(
      'skipToPreloadedMediaProduct',
      this.preloadedStreamingSessionId,
    );

    if (this.#preloadedPayload && this.#preloadManager) {
      const { mediaProduct, playbackInfo, streamInfo } = this.#preloadedPayload;

      return this.#loadAndDispatchMediaProductTransition({
        assetPosition: 0,
        assetUriOrPreloader: this.#preloadManager,
        mediaProduct,
        playbackInfo,
        streamInfo,
      });
    }

    return Promise.reject('Nothing preloaded.');
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

    await this.#preloadManager?.destroy();
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

    this.outputDeviceType = outputDevices.activeDevice.type;

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - setSinkId exists
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await mediaElementOne.setSinkId(sinkId);

      events.dispatchEvent(
        activeDeviceChangedEvent(outputDevices.activeDevice.id),
      );
    } catch (e) {
      console.error(e);
    }
  }

  get mediaElement(): HTMLMediaElement | null {
    return mediaElementOne;
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
