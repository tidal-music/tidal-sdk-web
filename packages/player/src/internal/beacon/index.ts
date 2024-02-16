import * as Config from '../../config';
import { db } from '../helpers/event-session';
import { credentialsProviderStore } from '../index';
import { trueTime } from '../true-time';

import type { CommitData, PrematureEvents } from './types';

/**
 * Generates a Web Worker from a function.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function workerize(method: Function) {
  const functionBody = `(${method.toString()})();`;
  const workerBlob = new Blob([functionBody], { type: 'text/javascript' });

  return URL.createObjectURL(workerBlob);
}

export let worker: Worker;

async function handleWorkerMessage(
  event: MessageEvent<{
    command: 'cleanUp';
    eventName: string;
    streamingSessionId: string;
  }>,
) {
  db.delete({
    name: event.data.eventName,
    streamingSessionId: event.data.streamingSessionId,
  });
}

/**
 * Start the event beacon worker.
 */
export async function start() {
  if (!worker) {
    const { beacon } = await import('./worker');

    worker = new Worker(workerize(beacon));

    worker.addEventListener('message', event => {
      handleWorkerMessage(event);
    });
  }
}

// eslint-disable-next-line disable-autofix/jsdoc/require-jsdoc
function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

export async function commit(
  beaconWorker: Worker | undefined,
  data: Pick<CommitData, 'events' | 'type'>,
) {
  if (beaconWorker) {
    const finishedEvents = await Promise.all(data.events);
    const definedEvents: Array<PrematureEvents> =
      finishedEvents.filter(notEmpty);

    data.events = definedEvents;

    const { clientId, token } =
      await credentialsProviderStore.credentialsProvider.getCredentials();

    if (!token) {
      throw new Error('No accessToken');
    }

    const message = {
      ...data,
      accessToken: token,
      apiUrl: Config.get('apiUrl'),
      appVersion: Config.get('appVersion'),
      clientId,
      clientPlatform: Config.get('clientPlatform'),
      eventUrl: Config.get('eventUrl'),
      ts: trueTime.now(),
    };

    beaconWorker.postMessage(JSON.stringify(message));

    return message;
  } else {
    console.warn('Event beacon is not running.');
  }
}
