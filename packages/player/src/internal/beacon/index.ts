import { get, set } from 'idb-keyval';

import * as Config from '../../config';
import { credentialsProviderStore } from '../index';
import { trueTime } from '../true-time';

import type { CommitData, PrematureEvents } from './types';
// @ts-expect-error Vite Worker import style
import BeaconWorker from './worker?worker&inline';

export let worker: Worker;

async function handleWorkerMessage(
  event: MessageEvent<{
    command: 'cleanUp';
    eventName: string;
    streamingSessionId: string;
  }>,
) {
  const savedEventMap = await get(event.data.eventName);
  const savedEvents = new Map(savedEventMap);

  savedEvents.delete(event.data.streamingSessionId);

  await set(event.data.eventName, [...savedEvents]);
}

/**
 * Start the event beacon worker.
 */
export async function start() {
  if (!worker) {
    worker = new BeaconWorker();

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
