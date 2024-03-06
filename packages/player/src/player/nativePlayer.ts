import { activeDeviceChanged as activeDeviceChangedEvent } from '../api/event/active-device-changed';
import { activeDeviceDisconnected as activeDeviceDisconnectedEvent } from '../api/event/active-device-disconnected';
import { activeDeviceModeChanged as activeDeviceModeChangedEvent } from '../api/event/active-device-mode-changed';
import { activeDevicePassThroughChanged as activeDevicePassThroughChangedEvent } from '../api/event/active-device-pass-through-changed';
import type { EndedEvent } from '../api/event/ended';
import { mediaProductTransition as mediaProductTransitionEvent } from '../api/event/media-product-transition';
import * as Config from '../config';
import { events } from '../event-bus';
import type { ErrorCodes } from '../internal';
import { PlayerError } from '../internal';
import * as StreamingMetrics from '../internal/event-tracking/streaming-metrics/index';
import { composePlaybackContext } from '../internal/helpers/compose-playback-context';
import { streamingSessionStore } from '../internal/helpers/streaming-session-store';
import type { OutputDevices } from '../internal/output-devices';
import { trueTime } from '../internal/true-time';

// eslint-disable-next-line import/order
import type { LoadPayload } from './basePlayer';

// eslint-disable-next-line import/no-cycle
import { BasePlayer } from './basePlayer';
import type {
  NativePlayerComponent,
  NativePlayerComponentDeviceDescription,
  NativePlayerComponentInterface,
  NativePlayerComponentSupportedEvents,
} from './nativeInterface';
import { playerState } from './state';

type MediaErrorCode =
  | 'file_checksum_mismatch'
  | 'no_such_file'
  | 'unreadable_file';

type MediaErrorMessage = {
  error: string;
  errorCode: MediaErrorCode;
};

const mediaErrorCodeMap: Record<MediaErrorCode, ErrorCodes> = {
  file_checksum_mismatch: 'NPO02',
  no_such_file: 'NPO01',
  unreadable_file: 'NPO03',
};

type DeviceErrorNames =
  | 'devicedisconnected'
  | 'deviceexclusivemodenotallowed'
  | 'deviceformatnotsupported'
  | 'devicelocked'
  | 'devicenotfound'
  | 'deviceunknownerror';

const deviceErrorCodeMap: Record<DeviceErrorNames, ErrorCodes> = {
  devicedisconnected: 'NPD01',
  deviceexclusivemodenotallowed: 'NPD02',
  deviceformatnotsupported: 'NPD03',
  devicelocked: 'NPD04',
  devicenotfound: 'NPD05',
  deviceunknownerror: 'NPD00',
};

let outputDevices: OutputDevices | undefined;

// eslint-disable-next-line import/no-default-export
export default class NativePlayer extends BasePlayer {
  #currentOutputId = 'default';

  /**
   * A Boolean which is true if the media contained in the element has finished playing.
   *
   * (Native player sends multiple "complete" events.
   * This variable should be set to true on the first call
   * to be able to ignore subsequent onces; until reset
   * for a new media product.)
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/ended
   */
  #duration!: number;

  #isReset = true;

  #player!: NativePlayerComponentInterface;

  #preloadedLoadPayload: LoadPayload | undefined;

  name = 'nativePlayer';

  playbackEngineHandlerAttached = false;

  constructor() {
    super();

    if (Config.get('outputDevicesEnabled')) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      (async () => {
        const impMod = await import('../internal/output-devices');

        outputDevices = impMod.outputDevices;

        this.#player.listDevices();
      })();
    }

    this.#player =
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      (window.NativePlayerComponent as NativePlayerComponent).Player();
    this.playbackState = 'IDLE';

    this.registerEventListeners();
    this.#player.setVolume(100);
  }

  // eslint-disable-next-line class-methods-use-this
  #handleDeviceError(errorName: DeviceErrorNames) {
    events.dispatchError(
      new PlayerError('EUnexpected', deviceErrorCodeMap[errorName]),
    );
  }

  #handleMediaError(e: { target: MediaErrorMessage }) {
    this.debugLog('handleMediaError', e.target);

    const mediaErrorMessage = e.target;
    const errorCode = mediaErrorCodeMap[mediaErrorMessage.errorCode];

    if (this.currentStreamingSessionId) {
      StreamingMetrics.playbackStatistics({
        errorCode,
        errorMessage: JSON.stringify(e.target),
        streamingSessionId: this.currentStreamingSessionId,
      });
    }

    events.dispatchError(new PlayerError('EUnexpected', errorCode));
  }

  #handleNativePlayerStateChange(state: string) {
    this.debugLog('handleNativePlayerStateChange', state);

    switch (state) {
      case 'paused':
      case 'ready':
        this.playbackState = 'NOT_PLAYING';
        break;
      case 'active':
        this.playbackState = 'PLAYING';
        break;
      case 'seeking':
      case 'idle':
        this.playbackState = 'STALLED';
        break;
      case 'uninitialized':
        this.playbackState = 'IDLE';
        break;
      case 'stopped': // Happens when stopping to buffer more data?
        this.playbackState = 'NOT_PLAYING';
        break;
      default:
        this.debugLog('No handling for state', state);
        break;
    }
  }

  async #handleNetworkError() {
    this.debugLog('handleNetworkError');

    const actualStartTimestamp = trueTime.timestamp(
      'streaming_metrics:playback_statistics:actualStartTimestamp',
    );
    const timeSinceStart =
      actualStartTimestamp !== undefined
        ? Math.abs(trueTime.now() - actualStartTimestamp)
        : 0;
    const ONE_HOUR = 3600000;

    // Do a complete reload since manifest has expired.
    if (timeSinceStart >= ONE_HOUR) {
      const mediaProduct = structuredClone(this.currentMediaProduct);
      const assetPosition = this.currentTime;

      this.finishCurrentMediaProduct('error');

      if (mediaProduct) {
        await this.hardReload(mediaProduct, assetPosition);
        await this.play(); // TODO: Maybe wrap in "if playing before network error"?
      }

      return;
    }

    /*
      Race playback stop with going online again.
      If we go online before playback stops; do nothing = native player retries and recovers.
      If playback stops without an online event emitting = emit error.
    */
    const raceResult = await Promise.race([
      this.mediaStateChange('idle') as Promise<'idle'>,
      new Promise<'online'>(resolve => {
        window.addEventListener('online', () => resolve('online'));
      }),
    ]);

    if (raceResult === 'idle') {
      events.dispatchError(new PlayerError('PENetwork', 'NPN01'));
    }
  }

  /**
   * Clean up native player before leaving for another player.
   */
  abandon() {
    if (outputDevices && outputDevices.deviceMode === 'exclusive') {
      /*
        Remove lock on audio device so shaka can use it. Otherwise throws error later when shaka is
        active player and a preload is done in native player (which triggers a device lock).
      */
      this.#player.selectSystemDevice();
    }
  }

  getPosition() {
    return this.currentTime;
  }

  /**
   * We cannot run multiple instances of native player so this function is
   * for catching duration for a preloaded item in native player.
   *
   * I.e. wait for player to load it and emit mediaduration event, then we
   * can gather the duration data and send a media product transition.
   */
  async handleAutomaticTransitionToPreloadedMediaProduct() {
    await this.nativeEvent('mediaduration');

    this.#preloadedLoadPayload = undefined;

    const mediaProductTransition =
      streamingSessionStore.getMediaProductTransition(
        this.preloadedStreamingSessionId,
      );

    if (!mediaProductTransition) {
      console.warn(
        'No media product transition saved for next item. Stopping playback.',
      );
      this.playbackState = 'NOT_PLAYING';

      return;
    }

    const { mediaProduct, playbackContext } = mediaProductTransition;

    const updatedPlaybackContext = {
      ...playbackContext,
      actualDuration: this.#duration,
    };

    if (this.preloadedStreamingSessionId) {
      streamingSessionStore.saveMediaProductTransition(
        this.preloadedStreamingSessionId,
        {
          mediaProduct,
          playbackContext: updatedPlaybackContext,
        },
      );
    }

    await this.mediaStateChange('active');

    events.dispatchEvent(
      mediaProductTransitionEvent(mediaProduct, updatedPlaybackContext),
    );

    this.currentStreamingSessionId = this.preloadedStreamingSessionId;

    this.mediaProductStarted(this.currentStreamingSessionId);
  }

  async load(payload: LoadPayload, transition: 'explicit' | 'implicit') {
    this.debugLog('load', payload);

    this.currentTime = payload.assetPosition;
    this.startAssetPosition = payload.assetPosition;

    // Ensure reset and set reset to false since we're loading anew.
    await this.reset();
    this.#isReset = false;

    const { assetPosition, mediaProduct, playbackInfo, streamInfo } = payload;
    const { securityToken, streamFormat, streamUrl } = streamInfo;

    this.currentStreamingSessionId = streamInfo.streamingSessionId;

    if (transition === 'explicit') {
      this.playbackState = 'NOT_PLAYING';
    }

    const mediaDurationEventPromise = this.nativeEvent('mediaduration');

    if (streamFormat) {
      this.#player.load(streamUrl, streamFormat, securityToken);
    } else {
      throw new Error('Stream format is undefined.');
    }

    await mediaDurationEventPromise;

    // Player was reset during load, do not continue.
    if (this.currentStreamingSessionId !== streamInfo.streamingSessionId) {
      return;
    }

    this.debugLog('load() duration is', this.#duration);

    if (assetPosition !== 0 && assetPosition < this.#duration) {
      // Native player cannot seek until active
      (async () => {
        await this.mediaStateChange('active');
        await this.seek(assetPosition);
        this.currentTime = assetPosition;
      })().catch(console.error);
    } else {
      this.currentTime = 0;
    }

    const playbackContext = composePlaybackContext({
      assetPosition,
      duration: this.#duration,
      playbackInfo,
      streamInfo,
    });

    streamingSessionStore.saveMediaProductTransition(
      streamInfo.streamingSessionId,
      { mediaProduct, playbackContext },
    );

    this.debugLog('load() mediaProductTransition');
    events.dispatchEvent(
      mediaProductTransitionEvent(mediaProduct, playbackContext),
    );

    this.debugLog('load() pb NOT_PLAYING');

    this.debugLog('load() done');
  }

  mediaStateChange(state: string): Promise<string> {
    return new Promise<string>(resolve => {
      this.#player.addEventListener(
        'mediastate',
        (event: Event & { target: string }) => {
          if (event.target === state) {
            resolve(event.target);
          }
        },
      );
    });
  }

  nativeEvent(eventName: NativePlayerComponentSupportedEvents): Promise<Event> {
    return new Promise(resolve => {
      this.#player.addEventListener(eventName, (event: Event) =>
        resolve(event),
      );
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async next(payload: LoadPayload) {
    this.debugLog('next', payload);

    // Cancel previous preload to load a new one.
    if (this.hasNextItem()) {
      await this.unloadPreloadedMediaProduct();
    }

    const { mediaProduct, playbackInfo, streamInfo } = payload;
    const { securityToken, streamFormat, streamUrl, streamingSessionId } =
      streamInfo;

    this.preloadedStreamingSessionId = streamingSessionId;

    this.debugLog('preloading', streamUrl, 'for', streamingSessionId);

    if (streamFormat) {
      this.#player.preload(streamUrl, streamFormat, securityToken);
    } else {
      console.error('Stream format undefined for preload.');
    }

    this.debugLog('preloading done');

    const playbackContext = composePlaybackContext({
      assetPosition: 0,
      duration: 0, // TODO: Cannot get duration here, try to solve in some other way...
      playbackInfo,
      streamInfo,
    });

    streamingSessionStore.saveMediaProductTransition(streamingSessionId, {
      mediaProduct,
      playbackContext,
    });

    this.#preloadedLoadPayload = payload;
  }

  pause() {
    this.#player.pause();
  }

  async play() {
    this.debugLog('play');

    await this.maybeHardReload();

    if (this.playbackState === 'IDLE') {
      this.debugLog('play()', this.playbackState, 'returning early');

      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.setStateToXIfNotYInZMs(1000, 'PLAYING', 'STALLED');

    await this.updateOutputDevice();

    this.mediaProductStarted(this.currentStreamingSessionId);
    this.debugLog('nativePlayer', 'play()');
    this.#player.play();
  }

  async playbackEngineEndedHandler(e: EndedEvent) {
    if (this.isActivePlayer) {
      const { reason } = e.detail;

      // Handles track progressions within native player
      if (reason === 'completed') {
        if (this.hasNextItem()) {
          await this.handleAutomaticTransitionToPreloadedMediaProduct();
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

  registerEventListeners() {
    this.debugLog('registerEventListeners');

    this.#player.addEventListener('mediacurrenttime', (e: Event) => {
      this.currentTime = Number(e.target);
    });

    this.#player.addEventListener(
      'mediastate',
      (e: Event & { target: string }) => {
        if (e.target === 'completed') {
          this.finishCurrentMediaProduct('completed');
        } else {
          this.#handleNativePlayerStateChange(e.target);
        }
      },
    );

    this.#player.addEventListener(
      'devices',
      (
        e: Event & { target: Array<NativePlayerComponentDeviceDescription> },
      ) => {
        if (outputDevices) {
          outputDevices.addNativeDevices(e.target);
        } else {
          console.error('Output devices not loaded.');
        }
      },
    );

    this.#player.addEventListener('devicedisconnected', () => {
      events.dispatchEvent(activeDeviceDisconnectedEvent());
      this.#handleDeviceError('devicedisconnected');
    });
    this.#player.addEventListener('deviceexclusivemodenotallowed', () =>
      this.#handleDeviceError('deviceexclusivemodenotallowed'),
    );
    this.#player.addEventListener('deviceformatnotsupported', () =>
      this.#handleDeviceError('deviceformatnotsupported'),
    );
    this.#player.addEventListener('devicelocked', () =>
      this.#handleDeviceError('devicelocked'),
    );
    this.#player.addEventListener('devicenotfound', () =>
      this.#handleDeviceError('devicenotfound'),
    );
    this.#player.addEventListener('deviceunknownerror', () =>
      this.#handleDeviceError('deviceunknownerror'),
    );

    // devicevolume is emitted when changing volume on Windows for some reason...? Not useful.
    // this.#player.addEventListener('devicevolume', e => { console.log('devicevolume', e) });
    // this.#player.addEventListener('devicevolumenotsupported', e => { console.log('devicevolumenotsupported', e) });
    this.#player.addEventListener(
      'mediaduration',
      (e: Event & { target: number }) => {
        this.#duration = Number(e.target);
      },
    );
    this.#player.addEventListener(
      'mediaerror',
      (e: { target: MediaErrorMessage }) => this.#handleMediaError(e),
    );
    this.#player.addEventListener('mediamaxconnectionsreached', () => {
      this.#handleNetworkError().catch(console.error);
    });
    // this.#player.addEventListener('version', e => console.log('version', e));
    // this.#player.listDevices();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async reset(
    { keepPreload }: { keepPreload: boolean } = { keepPreload: false },
  ) {
    if (this.#isReset) {
      return;
    }

    this.debugLog('reset');

    if (!keepPreload) {
      await this.unloadPreloadedMediaProduct();
    }

    this.#player.stop();

    if (this.playbackState !== 'IDLE') {
      this.finishCurrentMediaProduct('skip');
    }

    this.detachPlaybackEngineEndedHandler();

    this.currentStreamingSessionId = undefined;

    if (!keepPreload) {
      this.preloadedStreamingSessionId = undefined;
    }

    this.playbackState = 'IDLE';
    this.#isReset = true;
  }

  async seek(seconds: number) {
    // Native player cannot seek until active state has happened.
    if (!this.hasStarted()) {
      await this.mediaStateChange('active');
    }

    this.seekStart(this.currentTime);

    this.currentTime = seconds;
    this.#player.seek(seconds);

    this.seekEnd(this.currentTime);
  }

  // Handles track "skip next" and progressions between shaka and native player
  async skipToPreloadedMediaProduct() {
    this.debugLog(
      'skipToPreloadedMediaProduct',
      this.preloadedStreamingSessionId,
    );

    const firstPlayback = this.currentStreamingSessionId === undefined;

    if (this.preloadedStreamingSessionId && this.#preloadedLoadPayload) {
      const mediaProductTransition =
        streamingSessionStore.getMediaProductTransition(
          this.preloadedStreamingSessionId,
        );

      // Make sure to get updates from a potential overwriteMediaProduct call.
      if (mediaProductTransition) {
        this.#preloadedLoadPayload.mediaProduct =
          mediaProductTransition.mediaProduct;
      }

      await this.load(this.#preloadedLoadPayload, 'implicit');
      await this.updateOutputDevice();

      // Fake implicit transition when switching from shaka to native
      if (firstPlayback) {
        this.playbackState = 'PLAYING';
      }

      if (this.playbackState === 'IDLE') {
        this.playbackState = 'NOT_PLAYING';
      }

      return;
    }

    console.warn('No preloaded item in native player.');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async unloadPreloadedMediaProduct() {
    this.debugLog(
      'unloadPreloadedMediaProduct',
      this.preloadedStreamingSessionId,
    );

    if (this.hasNextItem()) {
      this.cleanUpStoredPreloadInfo();

      if ('cancelPreload' in this.#player) {
        this.#player.cancelPreload();
      } else {
        console.warn('cancelPreload not available. Update native player.');
      }
    }
  }

  updateDeviceMode() {
    this.updateOutputDevice()?.catch(console.error);

    if (outputDevices) {
      events.dispatchEvent(
        activeDeviceModeChangedEvent(outputDevices.deviceMode),
      );
    }
  }

  updateOutputDevice() {
    if (!outputDevices) {
      return Promise.resolve();
    }

    this.debugLog('updateOutputDevice', outputDevices.activeDevice);

    if (!outputDevices.activeDevice) {
      return Promise.resolve();
    }

    const { nativeDeviceId: sinkId } = outputDevices.activeDevice;

    this.outputDeviceType = outputDevices.activeDevice.type;

    if (sinkId === 'default') {
      if (this.#currentOutputId !== 'default') {
        this.#player.selectSystemDevice();
        events.dispatchEvent(activeDeviceChangedEvent('default'));
        this.#currentOutputId = 'default';
      }
    } else if (sinkId) {
      const deviceDescription = outputDevices.getNativeDevice(sinkId);

      if (deviceDescription) {
        this.#player.selectDevice(deviceDescription, outputDevices.deviceMode);
        events.dispatchEvent(
          activeDeviceChangedEvent(outputDevices.activeDevice.id),
        );
        events.dispatchEvent(
          activeDeviceModeChangedEvent(outputDevices.deviceMode),
        );
        this.#currentOutputId = sinkId;
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      console.warn(`Device with sinkId ${sinkId} not found.`);
    }

    return Promise.resolve();
  }

  /**
   * WIMPWC-7901
   * This is a temporary fix as there is currently no way to enable
   * the MQA decoder in Native Player after disabling it.
   *
   * Switching devices forces the Native Player to use the new device settings.
   * By default `device.passThrough` is `undefined`, that's why we check explicitly for `false`.
   *
   * TODO: Refactor when `this._player.enableMQADecoder();` works....
   */
  updatePassThrough() {
    if (!outputDevices) {
      return;
    }

    const { activeDevice } = outputDevices;

    if (outputDevices.passThrough === true) {
      this.#player.disableMQADecoder();
      events.dispatchEvent(activeDevicePassThroughChangedEvent(true));

      return;
    }

    // Has been disabled before
    if (outputDevices.passThrough === false) {
      this.#player.selectSystemDevice();

      if (activeDevice.nativeDeviceId) {
        const deviceDescription = outputDevices.getNativeDevice(
          activeDevice.nativeDeviceId,
        );

        if (deviceDescription) {
          this.#player.selectDevice(
            deviceDescription,
            outputDevices.deviceMode,
          );
        }
      } else {
        console.error(
          'Passthrough could not be properly disabled since the nativeDeviceId is missing for',
          activeDevice,
        );
      }
    }

    this.#player.enableMQADecoder();

    events.dispatchEvent(activeDevicePassThroughChangedEvent(false));
  }

  // eslint-disable-next-line class-methods-use-this
  get ready() {
    return Promise.resolve();
  }

  // eslint-disable-next-line class-methods-use-this
  get volume() {
    return Config.get('desiredVolumeLevel');
  }

  set volume(newVolume: number) {
    this.debugLog('Setting volume to', newVolume);
    this.#player.setVolume(newVolume * 100);
  }
}
