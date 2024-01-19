import type { MediaProduct } from '../../api/interfaces';
import { events } from '../../event-bus';
import { playerState } from '../../player/state';

/**
 * A class to handle connection lost/reconnect.
 *
 * Takes care of reloading a product when internet has
 * been lost and
 */
// eslint-disable-next-line import/no-default-export
export default class ConnectionHandler {
  /**
   * The current time position to restore playback from when connection is back online.
   */
  static #currentTime = 0;

  static #enabled = false;

  /**
   * The media product to restore when connection is back online.
   */
  static #mediaProduct: MediaProduct | null = null;

  static #offlineHandler: EventListener | undefined;

  static #onlineHandler: EventListener | undefined;

  static #playbackStateEventHandler: EventListener;

  static disable() {
    if (this.#enabled) {
      if (this.#offlineHandler) {
        window.removeEventListener('offline', this.#offlineHandler, false);
      }

      if (this.#onlineHandler) {
        window.removeEventListener('online', this.#onlineHandler, false);
      }

      this.#onlineHandler = undefined;
      this.#offlineHandler = undefined;
      this.#enabled = false;
    }
  }

  static enable() {
    if (!this.#enabled) {
      this.#onlineHandler = () => this.#handleOnline();
      this.#offlineHandler = () => this.#handleOffline();

      window.addEventListener('offline', this.#offlineHandler, false);
      window.addEventListener('online', this.#onlineHandler, false);

      this.#enabled = true;
    }
  }

  static #handleOffline() {
    const { activePlayer: player } = playerState;

    if (!player || !player.hasStarted()) {
      return;
    }

    this.#mediaProduct = player.currentMediaProduct;

    this.#playbackStateEventHandler = this.#saveCurrentTime.bind(this);
    /*
      Wait for playback state change so we store the current time
      when playback stops, since the player will play its buffer
      until playback stops.
    */
    events.addEventListener(
      'playback-state-change',
      this.#playbackStateEventHandler,
    );
  }

  static #handleOnline() {
    const { activePlayer: player } = playerState;

    if (!player || !player.hasStarted()) {
      return;
    }

    /*
      Only reload if not playing. So we don't reload during playback if connection is lost for
      a few seconds only. The player will retry fetches and restore itself. We only want to
      do a had reload if playback is stopped due to disconnection.
    */
    if (player.playbackState !== 'PLAYING' && this.#mediaProduct) {
      events.dispatchEvent(
        new CustomEvent('load', {
          detail: {
            currentTime: this.#currentTime,
            mediaProduct: this.#mediaProduct,
          },
        }),
      );
      this.#reset();
    }

    events.removeEventListener(
      'playback-state-change',
      this.#playbackStateEventHandler,
    );
  }

  static #reset() {
    this.#mediaProduct = null;
    this.#currentTime = 0;
  }

  static #saveCurrentTime() {
    const { activePlayer: player } = playerState;

    if (player) {
      this.#currentTime = player.currentTime;
    }
  }
}
