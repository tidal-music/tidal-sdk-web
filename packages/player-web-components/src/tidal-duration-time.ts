import * as Player from '@tidal-music/player';

import { asTime, timeDateTime } from './helpers';

const customElementName = 'tidal-duration-time';

export class TidalDurationTime extends HTMLElement {
  #$time: HTMLTimeElement | undefined;

  #hasEventListener = false;
  #mediaProductTransitionHandler: EventListener;

  constructor() {
    super();

    this.#mediaProductTransitionHandler = e => {
      const event = e as Player.MediaProductTransition;

      this.renderTime(event.detail.playbackContext.actualDuration);
    };

    this.#registerEventListeners();
  }

  #registerEventListeners() {
    if (!this.#hasEventListener) {
      Player.events.addEventListener(
        'media-product-transition',
        this.#mediaProductTransitionHandler,
        false,
      );

      this.#hasEventListener = true;
    }
  }

  #setUpShadowDOM() {
    const sDOM = this.attachShadow({ mode: 'open' });
    this.#$time = document.createElement('time');
    sDOM.appendChild(this.#$time);
  }

  connectedCallback() {
    this.#registerEventListeners();
    this.#setUpShadowDOM();

    const numberContent = parseInt(String(this.textContent), 10);
    const initialTime = Number.isNaN(numberContent) ? 0 : numberContent;

    this.renderTime(Player.getPlaybackContext()?.actualDuration ?? initialTime);
  }

  disconnectedCallback() {
    Player.events.removeEventListener(
      'media-product-transition',
      this.#mediaProductTransitionHandler,
      false,
    );
    this.#hasEventListener = false;
  }

  renderTime(seconds: number) {
    const roundedSeconds = parseInt(seconds.toFixed(0), 10);

    if (this.#$time) {
      this.#$time.textContent = asTime(roundedSeconds);
      this.#$time.setAttribute('datetime', timeDateTime(roundedSeconds));
    }
  }
}

customElements.define(customElementName, TidalDurationTime);

// Exporting the component name as string allows virtual DOM interop.
// eslint-disable-next-line import/no-default-export
export default customElementName;
