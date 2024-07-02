import type { Config, EPEvent } from '../types';

import WorkerUrl from './worker?worker&url';

if (!window.Worker) {
  throw new Error('Web Workers are not supported in this browser');
}

export const worker = new Worker(new URL(WorkerUrl, import.meta.url), {
  type: 'module',
});

type WorkerMessages = MessageEvent<
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

/**
 * Inits workers localforage database and loads stored events into memory.
 *
 * @returns {Promise<void>}
 */
export const initDB = (options?: {
  feralEventTypes: Config['feralEventTypes'];
}): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    worker.addEventListener('message', (message: WorkerMessages) => {
      const { data } = message;
      switch (data.action) {
        case 'initSuccess': {
          if (data.events) {
            const feralEvents = options?.feralEventTypes ?? [];
            // remove events in the wild that might be jamming the queue
            const events =
              feralEvents.length > 0
                ? data.events.filter(event => !feralEvents.includes(event.name))
                : data.events;
            setEvents(getEvents().concat(events));
          }
          resolve();
          break;
        }
        default:
          console.error('Unknown action:', message);
          reject(new Error('Unknown action'));
      }
    });

    worker.postMessage({ action: 'init' });
  });

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
