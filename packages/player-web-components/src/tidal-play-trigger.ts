import * as Player from '@tidal-music/player';

import { css } from './helpers';

const customElementName = 'tidal-play-trigger';

class TidalPlayTrigger extends HTMLElement {
  #clickHandler: EventListener;
  #hasEventListener = false;

  constructor() {
    super();

    this.#clickHandler = clickEvent => {
      clickEvent.preventDefault();
      this.#loadAndPlay().catch(console.error);
    };

    this.#registerEventListeners();
  }

  static get observedAttributes() {
    return ['product-id', 'product-type'];
  }

  async #loadAndPlay() {
    await this.#loadIfNotLoaded();

    if (Player.getPlaybackState() === 'PLAYING') {
      Player.pause();
    } else {
      await Player.play();
    }
  }

  #loadIfNotLoaded() {
    const currentProductIdInPlayer =
      Player.getMediaProduct()?.productId ?? undefined;

    if (
      this.mediaProduct &&
      this.mediaProduct.productId !== currentProductIdInPlayer
    ) {
      return Player.load(this.mediaProduct, 0);
    }

    return undefined;
  }

  #registerEventListeners() {
    if (!this.#hasEventListener) {
      this.addEventListener('click', this.#clickHandler, { passive: true });
    }
  }

  #setUpShadowDOM() {
    const sDOM = this.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = css`
      :host {
        display: contents;
      }
    `;

    const slot = document.createElement('slot');

    sDOM.appendChild(style);
    sDOM.appendChild(slot);
  }

  connectedCallback() {
    this.#registerEventListeners();
    this.#setUpShadowDOM();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.#clickHandler, {
      passive: true,
    } as AddEventListenerOptions & EventListenerOptions);
    this.#hasEventListener = false;
  }

  get mediaProduct(): Player.MediaProduct | undefined {
    const productId = this.getAttribute('product-id');

    if (!productId) {
      return undefined;
    }

    const productType =
      this.getAttribute('product-type') === 'video' ? 'video' : 'track';

    return {
      productId,
      productType,
      sourceId: '',
      sourceType: '',
    };
  }
}

customElements.define(customElementName, TidalPlayTrigger);

// Exporting the component name as string allows virtual DOM interop.
// eslint-disable-next-line import/no-default-export
export default customElementName;
