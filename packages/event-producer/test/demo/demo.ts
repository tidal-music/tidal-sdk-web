import { init } from '../../src';
import type { EPEvent } from '../../src';
import { sendEvent } from '../../src/send/send';
import { config as configFixture } from '../fixtures/config';
import {
  credentials1,
  credentialsProvider1,
} from '../fixtures/credentialsProvider';
import { eventPayload1 } from '../fixtures/events';

const setCredentialsToken = (token?: string) => {
  credentials1.token = token;
};

const noop = () => {};

class EventDemo extends HTMLElement {
  private fakeQueue: Array<EPEvent>;

  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.fakeQueue = [];
    init(configFixture).catch(console.error);
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadow.innerHTML = `<div><h1></h1><ul>
      <li><input type="text" placeholder="credentials token" id="credentialsTokenInp"/><button id="setCredentialsToken">Set credentials token</button><button id="deleteCredentialsToken">Delete token</button></li>
      <li><button id="sendEventBtn">Fire Event</button> <input id="inp" type="text" placeholder="event name"/></li>
      <li>${this.fakeQueue
        .map(
          ({ id, name }) =>
            `<span>${name}</span><button role="remove" evId="${id}">Remove</button>`,
        )
        .join('</li><li>')}</li>
      </ul><button id="submitEvents">Submit queue</button></div>`;
    if (this.shadowRoot) {
      const sendEventBtn = this.shadowRoot.querySelector('#sendEventBtn');
      const setCredentialsTokenBtn =
        this.shadowRoot.querySelector<HTMLButtonElement>(
          '#setCredentialsToken',
        );
      const deleteCredentialsTokenBtn =
        this.shadowRoot.querySelector<HTMLButtonElement>(
          '#deleteCredentialsToken',
        );
      const credentialsTokenInp =
        this.shadowRoot.querySelector<HTMLInputElement>('#credentialsTokenInp');
      const inp = this.shadowRoot.querySelector<HTMLInputElement>('#inp');
      const submitEventsBtn = this.shadowRoot.querySelector('#submitEvents');
      const removeBtns = this.shadowRoot.querySelectorAll('[role="remove"]');
      if (
        sendEventBtn &&
        inp &&
        submitEventsBtn &&
        setCredentialsTokenBtn &&
        deleteCredentialsTokenBtn &&
        credentialsTokenInp
      ) {
        setCredentialsTokenBtn.addEventListener('click', () => {
          if (credentialsTokenInp.value) {
            setCredentialsToken(credentialsTokenInp.value);
          } else {
            console.error('credentials token input is empty');
          }
        });
        sendEventBtn.addEventListener('click', () => {
          sendEvent({
            config: configFixture,
            credentialsProvider: credentialsProvider1,
            event: {
              ...eventPayload1,
              consentCategory: 'NECESSARY',
              name: inp.value ? inp.value : `empty${this.fakeQueue.length + 1}`,
            },
          }).catch(console.error);
        });
        deleteCredentialsTokenBtn.addEventListener('click', () => {
          setCredentialsToken();
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
