// Only import types, foreign code does not work, since this is a worker.
import type { PlaybackSessionEvent } from './play-log';
import type {
  DrmLicenceFetchEvent,
  PlaybackInfoFetchEvent,
  PlaybackStatisticsEvent,
  StreamingSessionStartEvent,
} from './streaming-metrics';
import type { CommitData, PrematureEvents } from './types';

export type BeaconEvent =
  | DrmLicenceFetchEvent
  | PlaybackInfoFetchEvent
  | PlaybackSessionEvent
  | PlaybackStatisticsEvent
  | StreamingSessionStartEvent;

type Batch = {
  batchId: string;
  events: Array<BeaconEvent>;
};

type Sessions = {
  channelId: number;
  client: {
    authorizedForOffline: boolean;
    authorizedForOfflineDate: any;
    id: number;
    name: string;
  };
  countryCode: string;
  partnerId: number;
  sessionId: string;
  userId: number;
};

export function beacon() {
  let queue: Array<BeaconEvent> = [];
  let accessToken: string | undefined;
  let clientId: string | undefined;
  let clientPlatform: string | undefined;
  let eventUrl: string | undefined;
  const userSessions = new Map<string, Sessions>();

  function generateGUID(): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-plus-operands
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => {
      const randomValue = crypto.getRandomValues(new Uint8Array(1))[0];
      return (c ^ ((randomValue ?? 0) & (15 >> (c / 4)))).toString(16);
    });
  }

  async function fetchUserSession(apiUrl: string, _accessToken: string) {
    // If accessToken is still the same, the clientId and userId we use and store is still the same.
    if (userSessions.has(_accessToken)) {
      return userSessions.get(_accessToken);
    }

    // Clear any old sessions
    userSessions.clear();

    const response = await fetch(apiUrl + '/sessions', {
      headers: new Headers({
        Authorization: 'Bearer ' + _accessToken,
      }),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - It is a thing.
      importance: 'low',
    });

    // eslint-disable-next-line require-atomic-updates
    const session = (await response.json()) as Sessions;

    userSessions.set(_accessToken, session);

    return session;
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setInterval(async () => {
    if (queue.length > 0 && accessToken && eventUrl) {
      const batch: Batch = {
        batchId: generateGUID(),
        events: [...queue],
      };

      try {
        const headers = new Headers();

        if (accessToken) {
          headers.append('authorization', 'Bearer ' + accessToken);
        }

        if (clientId) {
          headers.append('x-tidal-token', clientId);
        }

        // headers.append('x-requested-with', 'player-sdk');
        headers.append('content-type', 'application/json; boundary=player-sdk');

        const response = await fetch(eventUrl, {
          body: JSON.stringify(batch),
          headers,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - It is a thing.
          importance: 'low',
          method: 'POST',
        });

        if (response.ok) {
          queue.forEach(event => {
            if ('streamingSessionId' in event.payload) {
              postMessage({
                command: 'cleanUp',
                eventName: event.name,
                streamingSessionId: event.payload.streamingSessionId,
              });
            } else {
              // progress event is handled before send due to streamingSessionId missing here.
            }
          });
          // eslint-disable-next-line require-atomic-updates
          queue = [];
        } else {
          throw new Error('Response not ok');
        }
      } catch (e) {
        console.warn(e);
      }
    }
  }, 15000);

  onmessage = async e => {
    const data = JSON.parse((e as MessageEvent<string>).data) as CommitData;

    eventUrl = data.eventUrl;
    const userSession = await fetchUserSession(data.apiUrl, data.accessToken);

    if (data.accessToken) {
      accessToken = data.accessToken;
    }

    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.trace(
        'An accessToken is missing. Make sure to send at least one commit-payload with it defined, we cannot send events unless we have an access token.',
      );
    }

    if (data.clientId) {
      clientId = data.clientId;
    }

    if (data.clientPlatform) {
      clientPlatform = data.clientPlatform;
    }

    // Ensured to be awaited and undefined filtered out before we get to the worker
    const events = data.events as Array<PrematureEvents>;

    events.forEach(streamingEvent => {
      // streamingSessionId not allowed in the progress event
      if (
        streamingEvent.name === 'progress' &&
        'streamingSessionId' in streamingEvent.payload
      ) {
        postMessage({
          command: 'cleanUp',
          eventName: streamingEvent.name,
          streamingSessionId: streamingEvent.payload.streamingSessionId,
        });
        delete streamingEvent.payload.streamingSessionId;
      }

      const event = {
        client: {
          platform: clientPlatform,
          token: clientId,
          version: data.appVersion,
        },
        group: data.type,
        name: streamingEvent.name,
        payload: streamingEvent.payload,
        ts: data.ts,
        user: {
          accessToken,
          clientId: userSession?.client.id,
          id: userSession?.userId,
        },
        uuid: generateGUID(),
        version: data.type === 'playback' ? 1 : 2,
      } as BeaconEvent;

      queue.push(event);
    });
  };
}
