import * as Player from '@tidal-music/player';

import { css, html } from './helpers';

const styles = css`
  :host {
    display: inline-block;
  }

  #wrapper {
    width: 100%;
    height: 100%;
    contain: strict;
    background-color: rgba(255, 255, 255, 0.2);
    cursor: pointer;
  }

  #indicator {
    width: 100%;
    height: 100%;
    transform: none;
    will-change: transform;
    background-color: currentColor;
    pointer-events: none;
  }
`;

const ErrorMessages = {
  NO_DURATION:
    'You need to set duration before you can start/stop the progress bar.',
};

class TidalProgressBar extends HTMLElement {
  #animation: Animation | undefined;
  #animationDuration = 1;
  #indicator: HTMLElement | null = null;
  #mediaProductTransitionHandler: EventListener;
  #playbackStateChangeHandler: EventListener;
  #registeredEventListeners = new Set();
  #wrapper: HTMLElement | null = null;
  #wrapperClickHandler: EventListener;

  constructor() {
    super();

    this.#mediaProductTransitionHandler = e => {
      const event = e as Player.MediaProductTransition;

      this.duration = event.detail.playbackContext.actualDuration;

      if (Player.getPlaybackState() === 'PLAYING') {
        try {
          this.start();
        } catch (error) {
          console.warn(error);
        }
      }
    };

    this.#playbackStateChangeHandler = e => {
      const event = e as Player.PlaybackStateChange;

      try {
        if (event.detail.state === 'PLAYING') {
          this.start();
        } else {
          this.stop();
        }
      } catch (error) {
        console.warn(error);
      }
    };

    this.#wrapperClickHandler = clickEvent => {
      if (
        clickEvent instanceof MouseEvent ||
        clickEvent instanceof PointerEvent
      ) {
        this.handleClick(clickEvent);
      }
    };

    this.#registerEventListeners();
  }

  #registerEventListeners() {
    if (!this.#registeredEventListeners.has('media-product-transition')) {
      Player.events.addEventListener(
        'media-product-transition',
        this.#mediaProductTransitionHandler,
        false,
      );

      this.#registeredEventListeners.add('media-product-transition');
    }

    if (!this.#registeredEventListeners.has('playback-state-change')) {
      Player.events.addEventListener(
        'playback-state-change',
        this.#playbackStateChangeHandler,
      );

      this.#registeredEventListeners.add('playback-state-change');
    }

    if (this.#wrapper && !this.#registeredEventListeners.has('wrapper-click')) {
      this.#wrapper.addEventListener('click', this.#wrapperClickHandler, false);

      this.#registeredEventListeners.add('wrapper-click');
    }
  }

  #setUpShadowDOM() {
    const sDOM = this.attachShadow({ mode: 'closed' });

    sDOM.innerHTML = html`
      <style>
        ${styles}
      </style>
      <div id="wrapper">
        <div id="indicator"></div>
      </div>
    `;

    this.#wrapper = sDOM.querySelector('#wrapper');
    this.#indicator = sDOM.querySelector('#indicator');
  }

  /**
   * Renders the progress bar to a shadow DOM, caches references to the wrapper
   * && indicator elements and adds a click handler to the wrapper element for
   * handling the seeking.
   */
  connectedCallback() {
    this.#setUpShadowDOM();
    this.#registerEventListeners();
  }

  disconnectedCallback() {
    Player.events.removeEventListener(
      'media-product-transition',
      this.#mediaProductTransitionHandler,
      false,
    );

    Player.events.removeEventListener(
      'playback-state-change',
      this.#playbackStateChangeHandler,
    );

    this.#wrapper?.addEventListener('click', this.#wrapperClickHandler, false);

    this.#registeredEventListeners.clear();
  }

  /**
   * Calculates where in the progress bar the person clicked
   * in percent.
   *
   * @param {MouseEvent} mouse
   */
  getMousePositionAsPercent(mouse: MouseEvent | PointerEvent) {
    if (this.#wrapper) {
      const boundRect = this.#wrapper.getBoundingClientRect();
      const offset = {
        left: Math.abs(boundRect.left + window.pageXOffset - mouse.pageX),
        width: Math.round(boundRect.width),
      };

      return offset.left / offset.width;
    }

    return 0;
  }

  /**
   * Handle clicking the progress bar wrapper. Calculate the percentate
   * to seek to and emits a progress-bar:seek CustomEvent to be listened
   * to outside this component to react to the click.
   *
   * @param {MouseEvent | PointerEvent} event
   */
  handleClick(event: MouseEvent | PointerEvent) {
    const percent = this.getMousePositionAsPercent(event);
    const currentTime = this.#animationDuration * percent;

    this.currentTime = currentTime;

    Player.seek(currentTime / 1000);
  }

  /**
   * Starts the animation if duration is defined.
   *
   * @throws Will throw an error if duration is not set.
   */
  start() {
    if (!this.#animation) {
      throw new Error(ErrorMessages.NO_DURATION);
    }

    this.#animation.play();
  }

  /**
   * Stops the animation if duration is defined.
   *
   * @throws Will throw an error if duration is not set.
   */
  stop() {
    if (!this.#animation) {
      throw new Error(ErrorMessages.NO_DURATION);
    }

    this.#animation.pause();
  }

  /**
   * Set current time with milliseconds.
   *
   * @memberof ProgressBar
   */
  set currentTime(milliseconds: number) {
    if (this.#animation) {
      this.#animation.currentTime = milliseconds;
    }
  }

  /**
   * Setting this recrates the animation with the new duraton and pauses the animation.
   */
  set duration(milliseconds: number) {
    this.#animationDuration = milliseconds * 1000;

    /** @type {Keyframe[]} */
    const keyframes = [
      {
        transform: 'translateX(-100%)',
      },
      {
        transform: 'translateX(0%)',
      },
    ];

    this.#animation = this.#indicator?.animate(keyframes, {
      duration: this.#animationDuration,
      iterations: 1,
    });

    this.#animation?.pause();
  }

  /**
   * Setting this stops the animations, updates the playback rate and plays it again.
   */
  set playbackRate(playbackRate: number) {
    this.stop();

    if (this.#animation) {
      this.#animation.playbackRate = playbackRate;
    }

    this.start();
  }
}

const elementName = 'tidal-progress-bar';
customElements.define(elementName, TidalProgressBar);

// Exporting the component name as string allows virtual DOM interop.
// eslint-disable-next-line import/no-default-export
export default elementName;
