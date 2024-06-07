import type { EndedEvent } from '../api/event/ended';
import { mediaProductTransition as mediaProductTransitionEvent } from '../api/event/media-product-transition';
import * as Config from '../config';
import { events } from '../event-bus';
import { composePlaybackContext } from '../internal/helpers/compose-playback-context';
import { streamingSessionStore } from '../internal/helpers/streaming-session-store';
import { waitFor } from '../internal/helpers/wait-for';

import {
  ensureVideoElementsMounted,
  mediaElementOne,
  mediaElementTwo,
} from './audio-context-store';
import type { LoadPayload } from './basePlayer';
import { BasePlayer } from './basePlayer';

// eslint-disable-next-line import/no-default-export
export default class BrowserPlayer extends BasePlayer {
  #currentPlayer: HTMLVideoElement | undefined;

  #instanceOne: HTMLVideoElement;

  #instanceTwo: HTMLVideoElement;

  #isReset = true;

  #librariesLoad: Promise<void> | undefined;

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

  #triedToPlay = false;

  name = 'browserPlayer';

  constructor() {
    super();

    this.playbackState = 'IDLE';

    const setPlaying = () => {
      // Safari can send playing events wrongly. Verify the media event is actually playing.
      if (this.mediaElement && !this.mediaElement.paused) {
        this.playbackState = 'PLAYING';
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

    const setStalled = () => {
      this.playbackState = 'STALLED';
    };

    const setNotPlaying = () => {
      (async () => {
        const mediaEl = this.#currentPlayer;

        if (mediaEl) {
          const mostLikelyWillPlayPreloadASAP =
            this.preloadedStreamingSessionId &&
            mediaEl.currentTime === mediaEl.duration;

          if (mostLikelyWillPlayPreloadASAP) {
            await waitFor(1000);

            const actuallyPlayedPreload =
              mediaEl.currentTime !== mediaEl.duration;

            if (actuallyPlayedPreload) {
              return;
            }
          }

          this.playbackState = 'NOT_PLAYING';
        }
      })().catch(console.error);
    };

    const timeUpdateHandler = (e: Event) => {
      if (e instanceof Event) {
        const mediaElement = e.target as HTMLMediaElement;

        if (mediaElement.readyState > HTMLMediaElement.HAVE_NOTHING) {
          this.currentTime = mediaElement.currentTime;
        }
      }
    };

    const endedHandler = (e: Event) => {
      timeUpdateHandler(e);
      this.finishCurrentMediaProduct('completed');
    };

    const errorHandler = (e: Event) =>
      console.error('HTMLMediaElement errored', e);

    const seekedHandler = () => {
      if (this.mediaElement) {
        this.currentTime = this.mediaElement.currentTime;
        this.seekEnd(this.currentTime);
      }
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

    ensureVideoElementsMounted().then().catch(console.error);

    this.#instanceOne = mediaElementOne;
    this.#instanceTwo = mediaElementTwo;

    this.currentPlayer = this.#instanceOne;
  }

  #getNextPlayerInstance() {
    return [this.#instanceOne, this.#instanceTwo]
      .filter(x => x !== this.#currentPlayer)
      .pop();
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

  getPosition() {
    this.debugLog('getPosition');

    if (this.mediaElement) {
      if (this.mediaElement.ended) {
        this.currentTime = 0;
      } else {
        this.currentTime = this.mediaElement.currentTime;
      }
    }

    return this.currentTime;
  }

  async load(payload: LoadPayload, transition: 'explicit' | 'implicit') {
    this.debugLog('load', payload);

    this.currentTime = payload.assetPosition;
    this.startAssetPosition = payload.assetPosition;

    await ensureVideoElementsMounted();

    // Ensure reset and set reset to false since we're loading anew.
    await this.reset();
    this.#isReset = false;

    if (transition === 'explicit') {
      this.playbackState = 'NOT_PLAYING';
    }

    const { assetPosition, mediaProduct, playbackInfo, streamInfo } = payload;

    this.currentStreamingSessionId = streamInfo.streamingSessionId;

    const { currentPlayer } = this;

    if (!currentPlayer) {
      return;
    }

    const playerLoad = new Promise<void>(resolve =>
      currentPlayer.addEventListener('canplay', () => resolve(), {
        once: true,
      }),
    );

    currentPlayer.src = streamInfo.streamUrl;
    currentPlayer.currentTime = assetPosition;
    currentPlayer.load();

    const durationWait = new Promise<number>(resolve =>
      currentPlayer.addEventListener(
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

    const duration = await durationWait;

    const playbackContext = composePlaybackContext({
      assetPosition,
      duration,
      playbackInfo,
      streamInfo,
    });

    streamingSessionStore.saveMediaProductTransition(
      streamInfo.streamingSessionId,
      { mediaProduct, playbackContext },
    );

    this.debugLog('dispatching mediaProductTransition');
    events.dispatchEvent(
      mediaProductTransitionEvent(mediaProduct, playbackContext),
    );

    if (this.#triedToPlay) {
      this.#triedToPlay = false;
      return this.play();
    }

    return Promise.resolve();
  }

  async next(payload: LoadPayload) {
    this.debugLog('next', payload);

    /*
      A play action can only start playback if playback state is not IDLE.
      If shaka is currently not playing anything and we preload to play something soon,
      we need to set playback state to NOT_PLAYING so we can start later.
    */
    if (this.playbackState === 'IDLE') {
      this.playbackState = 'NOT_PLAYING';
    }

    const { mediaProduct, playbackInfo, streamInfo } = payload;

    const preloadPlayer = this.#getNextPlayerInstance();

    this.preloadedStreamingSessionId = streamInfo.streamingSessionId;

    // Load the manifest in the player and make sure to catch durationchange event for
    if (!preloadPlayer) {
      return;
    }

    preloadPlayer.src = streamInfo.streamUrl;
    preloadPlayer.load(); // Just log error for preloads

    const duration = await new Promise<number>(resolve =>
      preloadPlayer.addEventListener(
        'durationchange',
        e => {
          if (e.target instanceof HTMLMediaElement) {
            resolve(e.target.duration);
          }
        },
        { once: true },
      ),
    );

    const playbackContext = composePlaybackContext({
      assetPosition: 0,
      duration,
      playbackInfo,
      streamInfo,
    });

    streamingSessionStore.saveMediaProductTransition(
      streamInfo.streamingSessionId,
      {
        mediaProduct,
        playbackContext,
      },
    );
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

    if (this.playbackState === 'IDLE') {
      this.debugLog('is IDLE, returning early');
      this.#triedToPlay = true;

      return Promise.resolve();
    }

    if ('setSinkId' in mediaElementOne) {
      await this.updateOutputDevice();
    }

    if (this.currentStreamingSessionId) {
      this.mediaProductStarted(this.currentStreamingSessionId);
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.setStateToXIfNotYInZMs(1000, 'PLAYING', 'STALLED');

    if (this.currentPlayer) {
      // eslint-disable-next-line no-console
      await this.currentPlayer.play().catch(console.error);
    }
  }

  async playbackEngineEndedHandler(e: EndedEvent) {
    if (this.isActivePlayer) {
      const { reason } = e.detail;

      if (reason === 'completed') {
        if (this.hasNextItem()) {
          await this.skipToPreloadedMediaProduct();
          await this.play();
        } else {
          console.warn('No item preloaded, not progressing.');
          this.playbackState = 'NOT_PLAYING';
        }
      }
    }
  }

  async reset(
    { keepPreload }: { keepPreload: boolean } = { keepPreload: false },
  ) {
    if (this.#isReset) {
      return Promise.resolve();
    }

    this.debugLog('reset');

    if (this.playbackState !== 'IDLE') {
      this.finishCurrentMediaProduct('skip');
    }

    this.playbackState = 'IDLE';

    this.detachPlaybackEngineEndedHandler();

    this.currentStreamingSessionId = undefined;

    if (!keepPreload) {
      this.preloadedStreamingSessionId = undefined;
    }

    const { currentPlayer } = this;

    if (currentPlayer && currentPlayer.readyState !== 0) {
      currentPlayer.load();
      await new Promise<void>(r =>
        currentPlayer.addEventListener('emptied', () => r(), { passive: true }),
      );
    }

    this.#isReset = true;

    return Promise.resolve();
  }

  seek(currentTime: number) {
    this.debugLog('seek', currentTime);

    const { currentPlayer: mediaEl } = this;
    const seconds = currentTime;

    if (!mediaEl) {
      return;
    }

    this.seekStart(this.currentTime);

    if ('fastSeek' in mediaEl) {
      mediaEl.fastSeek(seconds);
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mediaEl.currentTime = seconds;
    }

    return new Promise<number>(r => {
      mediaEl.addEventListener('seeked', () => r(mediaEl.currentTime), {
        once: true,
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async skipToPreloadedMediaProduct() {
    const mediaProductTransition =
      streamingSessionStore.getMediaProductTransition(
        this.preloadedStreamingSessionId,
      );

    if (!mediaProductTransition) {
      this.playbackState = 'NOT_PLAYING';

      return;
    }

    this.debugLog(
      'skipToPreloadedMediaProduct',
      this.preloadedStreamingSessionId,
    );

    const preloadPlayer = this.#getNextPlayerInstance();

    if (preloadPlayer) {
      this.currentPlayer = preloadPlayer;
      this.currentStreamingSessionId = String(this.preloadedStreamingSessionId);
      this.preloadedStreamingSessionId = undefined;

      const { mediaProduct, playbackContext } = mediaProductTransition;

      events.dispatchEvent(
        mediaProductTransitionEvent(mediaProduct, playbackContext),
      );

      if (this.playbackState === 'IDLE') {
        this.playbackState = 'NOT_PLAYING';
      }
    }
  }

  togglePlayback() {
    this.debugLog('togglePlayback');

    if (this.mediaElement) {
      if (this.mediaElement.paused) {
        this.mediaElement.play().catch(console.error);
      } else {
        this.mediaElement.pause();
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async unloadPreloadedMediaProduct() {
    this.debugLog(
      'unloadPreloadedMediaProduct',
      this.preloadedStreamingSessionId,
    );

    this.cleanUpStoredPreloadInfo();

    const preloadPlayer = this.#getNextPlayerInstance();

    if (preloadPlayer) {
      preloadPlayer.src = '';
      preloadPlayer.load();
    }
  }

  get currentPlayer() {
    return this.#currentPlayer;
  }

  set currentPlayer(newCurrentPlayer: HTMLVideoElement | undefined) {
    this.debugLog('set currentPlayer', newCurrentPlayer);

    if (this.#currentPlayer) {
      this.#mediaElementEvents(this.#currentPlayer, false);
      this.#currentPlayer.load();
    }

    if (newCurrentPlayer) {
      this.#currentPlayer = newCurrentPlayer;
      this.#mediaElementEvents(newCurrentPlayer, true);
    }
  }

  get mediaElement(): HTMLMediaElement | null {
    return this.currentPlayer ?? null;
  }

  get ready() {
    return this.#librariesLoad;
  }

  get volume() {
    return Config.get('desiredVolumeLevel');
  }

  set volume(newVolume: number) {
    this.debugLog('Setting volume to', newVolume);

    if (this.currentPlayer) {
      this.currentPlayer.volume = newVolume;
    }
  }
}
