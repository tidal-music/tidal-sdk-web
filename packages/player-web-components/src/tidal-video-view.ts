import * as Player from '@tidal-music/player';

import { css } from './helpers';

const styles = css`
  :host {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 16/9;
    background-color: black;
  }

  ::slotted(video) {
    display: block;
    width: 100%;
    height: 100%;
    z-index: 1;
    position: relative;
    background-color: black;
  }
`;

const customElementName = 'tidal-video-view';

class TidalVideoView extends HTMLElement {
  #hasEventListener = false;

  #mediaProductTransitionHandler: EventListener;

  #playbackStateChangeHandler: EventListener;

  constructor() {
    super();

    this.#mediaProductTransitionHandler = e => {
      const event = e as Player.MediaProductTransition;

      if (event.detail.mediaProduct.productType === 'video') {
        this.mountPlayer();
      }
    };

    this.#playbackStateChangeHandler = e => {
      const event = e as Player.PlaybackStateChange;

      this.setAttribute(
        'playback-state',
        event.detail.state.toLocaleLowerCase(),
      );
    };

    this.#registerEventListeners();
  }

  #registerEventListeners() {
    if (this.#hasEventListener) {
      return;
    }

    Player.events.addEventListener(
      'media-product-transition',
      this.#mediaProductTransitionHandler,
      false,
    );

    Player.events.addEventListener(
      'playback-state-change',
      this.#playbackStateChangeHandler,
      false,
    );
  }

  connectedCallback() {
    this.#registerEventListeners();

    const sDOM = this.attachShadow({ mode: 'closed' });
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;

    const slotElement = document.createElement('slot');

    sDOM.appendChild(styleElement);
    sDOM.appendChild(slotElement);
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
      false,
    );

    this.#hasEventListener = true;
  }

  mountPlayer() {
    const activeVideoElement = Player.getMediaElement();

    if (activeVideoElement) {
      this.innerHTML = '';
      this.appendChild(activeVideoElement);
    }
  }
}

customElements.define(customElementName, TidalVideoView);

// Exporting the component name as string allows virtual DOM interop.
// eslint-disable-next-line import/no-default-export
export default customElementName;
