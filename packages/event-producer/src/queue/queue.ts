import type { Config, EPEvent } from '../types.js';

import QueueWebWorker from './worker?worker&inline';

if (!window.Worker) {
  throw new Error('Web Workers are not supported in this browser');
}

export const worker = new QueueWebWorker();

type WorkerMessages = MessageEvent<
  | {
      action: 'clearFailed';
    }
  | {
      action: 'clearSuccess';
    }
  | {
      action: 'init';
      events: Array<EPEvent>;
    }
  | {
      action: 'initFailed';
    }
  | {
      action: 'initSuccess';
      events: Array<EPEvent>;
    }
>;

let _events: Array<EPEvent> = [];

export function getEvents() {
  return _events;
}

/**
 * Gets the first 10 events from the queue.
 *
 * @returns {Array<EPEvent>}
 */
export function getEventBatch(): Array<EPEvent> {
  const events = getEvents();
  if (events.length >= 10) {
    return events.slice(0, 10);
  }
  return events;
}

/**
 * Sets events in queue.
 *
 * @param {Array<EPEvent>} newEvents
 */
export function setEvents(newEvents: Array<EPEvent>) {
  _events = newEvents;
}

type WorkerReply = WorkerMessages['data'];

/**
 * Posts a request to the worker and resolves with the first reply whose
 * action is one of `replyActions`. Replies for other requests (e.g. a clear
 * reply while an init is pending) are ignored by this listener. The listener
 * is removed once a matching reply arrives, so nothing leaks per request.
 *
 * @returns {Promise<WorkerReply>}
 */
const requestFromWorker = (
  request: { action: 'clear' | 'init' },
  replyActions: Array<WorkerReply['action']>,
): Promise<WorkerReply> =>
  new Promise<WorkerReply>(resolve => {
    const onMessage = (message: WorkerMessages) => {
      if (!replyActions.includes(message.data.action)) {
        return;
      }
      worker.removeEventListener('message', onMessage);
      resolve(message.data);
    };
    worker.addEventListener('message', onMessage);

    worker.postMessage(request);
  });

type InitDBOptions = {
  feralEventTypes: Config['feralEventTypes'];
};

/**
 * Sends one init request to the worker and settles on its reply.
 *
 * @returns {Promise<void>}
 */
const requestInit = async (options?: InitDBOptions): Promise<void> => {
  const reply = await requestFromWorker({ action: 'init' }, [
    'initSuccess',
    'initFailed',
  ]);
  if (reply.action !== 'initSuccess') {
    throw new Error('Failed to initialize queue db');
  }
  if (reply.events) {
    const feralEvents = options?.feralEventTypes ?? [];
    // remove events in the wild that might be jamming the queue
    const events =
      feralEvents.length > 0
        ? reply.events.filter(event => !feralEvents.includes(event.name))
        : reply.events;
    setEvents(getEvents().concat(events));
  }
};

/**
 * The init request currently awaiting a worker reply, if any. Replies are not
 * correlated with requests, so overlapping initDB calls share one request
 * instead of both consuming the first reply.
 */
let initInFlight: Promise<void> | null = null;

/**
 * Inits workers localforage database and loads stored events into memory.
 *
 * Only one init request is in flight at a time; concurrent callers share it.
 *
 * @returns {Promise<void>}
 */
export const initDB = (options?: InitDBOptions): Promise<void> => {
  if (initInFlight) {
    return initInFlight;
  }
  initInFlight = requestInit(options).finally(() => {
    initInFlight = null;
  });
  return initInFlight;
};

/**
 * The clear request currently awaiting a worker reply, if any.
 */
let clearInFlight: Promise<number> | null = null;

/**
 * Drops all queued events from memory and from the db.
 *
 * Resolves with the number of events dropped once the worker has confirmed the
 * db is cleared. Rejects if the db could not be cleared (memory is still
 * emptied in that case). Concurrent callers share one request.
 *
 * @returns {Promise<number>}
 */
export const clearEvents = (): Promise<number> => {
  if (clearInFlight) {
    return clearInFlight;
  }
  const dropped = _events.length;
  _events = [];
  clearInFlight = requestFromWorker({ action: 'clear' }, [
    'clearSuccess',
    'clearFailed',
  ])
    .then(reply => {
      if (reply.action !== 'clearSuccess') {
        throw new Error('Failed to clear queue db');
      }
      return dropped;
    })
    .finally(() => {
      clearInFlight = null;
    });
  return clearInFlight;
};

/**
 * Persists events in db.
 */
export function persistEvents() {
  worker.postMessage({ action: 'persist', events: getEvents() });
}

/**
 * Removes events from the queue and persist queue.
 *
 * @param {Array<string>} idsToRemove
 */
export function removeEvents(idsToRemove: Array<string>) {
  _events = _events.filter(event => !idsToRemove.includes(event.id));
  persistEvents();
}

/**
 * Adds an event to the queue and persist queue.
 *
 * @param {EPEvent} event
 */
export function addEvent(event: EPEvent) {
  _events.push(event);
  persistEvents();
}
