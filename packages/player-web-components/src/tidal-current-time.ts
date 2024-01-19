import * as Player from '@tidal-music/player';

import { asTime, timeDateTime } from './helpers';

const customElementName = 'tidal-current-time';

export class TidalCurrentTime extends HTMLElement {
  #$time: HTMLTimeElement | undefined = undefined;

  #connectedMediaElements = new Set<HTMLMediaElement>();

  #handleMediaProductTransition: EventListener;

  #resetTime: EventListener;

  #timeUpdateHandler: EventListener;

  constructor() {
    super();

    this.#timeUpdateHandler = event =>
      this.renderTime((event.target as HTMLMediaElement).currentTime);
    this.#resetTime = () => this.renderTime(0);
    this.#handleMediaProductTransition =
      this.#registerTimeUpdateListener.bind(this);
  }

  #registerTimeUpdateListener() {
    const $media = Player.getMediaElement();

    if ($media && this.#$time && !this.#connectedMediaElements.has($media)) {
      $media.addEventListener('timeupdate', this.#timeUpdateHandler, false);
      this.#connectedMediaElements.add($media);
    }
  }

  connectedCallback() {
    const sDOM = this.attachShadow({ mode: 'open' });

    sDOM.innerHTML = '<time></time>';

    const timeElement = sDOM.querySelector('time');

    if (this.#$time === undefined && timeElement !== null) {
      this.#$time = timeElement;
    }

    this.renderTime(Player.getAssetPosition());

    Player.events.addEventListener(
      'media-product-transition',
      this.#handleMediaProductTransition,
      false,
    );
    Player.events.addEventListener('ended', this.#resetTime, false);
  }

  disconnectedCallback() {
    for (let connectedMediaElement of this.#connectedMediaElements) {
      connectedMediaElement.removeEventListener(
        'timeupdate',
        this.#timeUpdateHandler,
        false,
      );
    }

    Player.events.removeEventListener(
      'media-product-transition',
      this.#handleMediaProductTransition,
      false,
    );
    Player.events.removeEventListener('ended', this.#resetTime, false);
  }

  renderTime(seconds: number) {
    const roundedSeconds = Math.floor(seconds);

    if (this.#$time) {
      this.#$time.textContent = asTime(roundedSeconds);
      this.#$time.setAttribute('datetime', timeDateTime(roundedSeconds));
    }
  }
}

customElements.define(customElementName, TidalCurrentTime);

// Exporting the component name as string allows virtual DOM interop.
// eslint-disable-next-line import/no-default-export
export default customElementName;
