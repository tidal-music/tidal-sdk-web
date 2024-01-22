import { dispatchEvent, init } from '../../src';
import type { EPEvent } from '../../src';
import { config as configFixture } from '../fixtures/config';
import { eventPayload1 } from '../fixtures/events';

const noop = () => {};

class EventDemo extends HTMLElement {
  private fakeQueue: Array<EPEvent>;

  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.fakeQueue = [];
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadow.innerHTML = `<div><h1></h1><ul>
      <li><button id="initBtn">Init</button></li>
      <li><button id="dispatchEventBtn">Fire Event</button> <input id="inp" type="text" placeholder="event name"/></li>
      <li>${this.fakeQueue
        .map(
          ({ id, name }) =>
            `<span>${name}</span><button role="remove" evId="${id}">Remove</button>`,
        )
        .join('</li><li>')}</li>
      </ul><button id="submitEvents">Submit queue</button></div>`;
    if (this.shadowRoot) {
      const initBtn = this.shadowRoot.querySelector('#initBtn');
      const dispatchEventBtn =
        this.shadowRoot.querySelector('#dispatchEventBtn');
      const inp = this.shadowRoot.querySelector<HTMLInputElement>('#inp');
      const submitEventsBtn = this.shadowRoot.querySelector('#submitEvents');
      const removeBtns = this.shadowRoot.querySelectorAll('[role="remove"]');
      if (dispatchEventBtn && inp && submitEventsBtn && initBtn) {
        initBtn.addEventListener('click', () => {
          // eslint-disable-next-line no-console
          init(configFixture).then(console.log).catch(console.error);
        });
        dispatchEventBtn.addEventListener('click', () => {
          dispatchEvent({
            ...eventPayload1,
            consentCategory: 'NECESSARY',
            name: inp.value ? inp.value : `empty${this.fakeQueue.length + 1}`,
          });
        });
        submitEventsBtn.addEventListener(
          'click',
          // @ts-expect-error TODO: add to global.d.ts
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
          globalThis.__tepDebug.flushEvents,
        );
        removeBtns.forEach(delEl => {
          delEl.addEventListener('click', noop);
        });
      }
    }
  }
}

customElements.define('event-demo', EventDemo);
