import { streamingPrivilegesRevokedEvent } from '../../api/event/streaming-privileges-revoked';
import * as Config from '../../config';
import { events } from '../../event-bus';
import { getAccessToken, isAuthorizedWithUser } from '../../internal/index';
import { playerState } from '../../player/state';
import { trueTime } from '../true-time';

// Outgoing events: client -> pushkin

type UserActionEventPayload = Readonly<{
  startedAt: number;
}>;

type UserActionEvent = Readonly<{
  payload: UserActionEventPayload;
  type: 'USER_ACTION';
}>;

export type OutgoingEvents = UserActionEvent;

// Incoming events: pushkin -> client

type TimeInformation = Readonly<{
  clientTime: string;
  serverTime: string;
}>;

// Named OutgoingPrivilegedSessionNotification in back-end.
type PrivilegedSessionNotificationEventPayload = Readonly<{
  clientDisplayName: null | string | undefined;
  endsAt: TimeInformation;
  sessionId: string;
  updatedAt: TimeInformation;
}>;

type PrivilegedSessionNotificationEvent = Readonly<{
  payload: PrivilegedSessionNotificationEventPayload;
  type: 'PRIVILEGED_SESSION_NOTIFICATION';
}>;

type ReconnectEvent = Readonly<{
  type: 'RECONNECT';
}>;

export type IncomingEvent = PrivilegedSessionNotificationEvent | ReconnectEvent;

let pushkin: Pushkin | undefined;

// Only exported for testing.
// eslint-disable-next-line disable-autofix/jsdoc/require-jsdoc
export async function fetchWebSocketURL(accessToken: string) {
  const apiUrl = Config.get('apiUrl');
  const response = await fetch(apiUrl + '/rt/connect', {
    headers: new Headers({
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    }),
    method: 'POST',
  });

  type RtConnectResponse = Readonly<{
    url: string;
  }>;

  const { url } = (await response.json()) as RtConnectResponse;

  return url;
}

// Only exported for testing.
// eslint-disable-next-line disable-autofix/jsdoc/require-jsdoc
export function socketOpen(webSocket: WebSocket) {
  return new Promise<void>(resolve => {
    webSocket.addEventListener('open', () => resolve(), { once: true });
  });
}

/**
 * Connects to the Pushkin service over web sockets. Pauses the music
 * on incoming PRIVILEGED_SESSION_NOTIFICATION messages, and used to
 * send USER_ACTION messages when a user clicks the play button in
 * the application UI.
 */
export class Pushkin {
  #closeHandler: EventListener | undefined;

  #connecting!: Promise<void>;

  #messageHandler: EventListener | undefined;

  #socket!: WebSocket | undefined;

  constructor() {
    this.#socket = undefined;
    this.#connecting = this.#connect();

    events.addEventListener('user-action', () => {
      if (this.connected) {
        this.userAction().then().catch(console.error);
      }
    });
  }

  /**
   * Call this method to ensure pushkin is running.
   */
  static async ensure() {
    const allowed = await isAuthorizedWithUser();

    if (!allowed) {
      return;
    }

    if (!pushkin) {
      pushkin = new Pushkin();
    } else if (!pushkin.connected) {
      await pushkin.reconnect();
    }
  }

  /**
   * Call this method when credentials changes to re-setup pushkin with the new credentials
   */
  static async refresh() {
    const allowed = await isAuthorizedWithUser();

    if (!allowed) {
      return;
    }

    const accessToken = await getAccessToken();

    if (pushkin && accessToken) {
      pushkin.reconnect().catch(console.error);
    }
  }

  async #connect() {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error('No access token to connect to Pushkin.');
    }

    const url = await fetchWebSocketURL(accessToken);

    if (!url) {
      return;
    }

    this.#socket = new WebSocket(url);

    await socketOpen(this.#socket);

    this.#messageHandler = ((event: MessageEvent<string>) =>
      this.#handleSocketMessage(event.data)) as EventListener;
    this.#closeHandler = () => this.#handleSocketClose();

    this.#socket.addEventListener('message', this.#messageHandler, false);
    this.#socket.addEventListener('closed', this.#closeHandler, false);
    window.addEventListener('online', () => this.#handleSocketClose(), {
      once: true,
    });
  }

  async #emit(event: OutgoingEvents) {
    if (!this.#socket) {
      throw new Error(
        'No socket connected. Did you forget to call connect method in Pushkin service first?',
      );
    }

    if (this.#socket.readyState !== WebSocket.OPEN) {
      await this.#connecting;
    }

    this.#socket.send(JSON.stringify(event));
  }

  #handleSocketClose() {
    this.#connecting = this.#connect();
  }

  #handleSocketMessage(rawEventData: string) {
    const event = JSON.parse(rawEventData) as IncomingEvent;

    switch (event.type) {
      case 'PRIVILEGED_SESSION_NOTIFICATION': {
        events.dispatchEvent(
          streamingPrivilegesRevokedEvent(
            String(event.payload.clientDisplayName),
          ),
        );
        playerState.activePlayer?.pause();
        break;
      }
      case 'RECONNECT':
        this.reconnect().catch(console.error);
        break;
      default:
        console.warn('Unhandled event from Pushkin: ', event);
        break;
    }
  }

  reconnect(): Promise<void> {
    if (this.#socket) {
      if (this.#messageHandler) {
        this.#socket.removeEventListener('message', this.#messageHandler);
      }

      if (this.#closeHandler) {
        this.#socket.removeEventListener('closed', this.#closeHandler);
      }

      this.#socket.close();
      this.#connecting = this.#connect();

      return this.#connecting;
    }

    return Promise.resolve();
  }

  /**
   * Call this method to tell Pushkin a user action happened, so it can
   * make good qualified guesses if you're the session with allowed playback-
   */
  async userAction() {
    if (!this.connected) {
      await this.reconnect();
    }

    try {
      await this.#emit({
        payload: {
          startedAt: trueTime.now(),
        },
        type: 'USER_ACTION',
      });
    } catch (e) {
      console.error(e);
    }
  }

  get connected() {
    return this.#socket && this.#socket.readyState === WebSocket.OPEN;
  }
}
