import type { EPEvent } from '../types';

import { db } from './db';

let events: Array<EPEvent> = [];

export function getEvents() {
  return events;
}

/**
 * Gets the first 10 events from the queue.
 *
 * @returns {Array<EPEvent>}
 */
export function getEventBatch(): Array<EPEvent> {
  if (events.length >= 10) {
    return events.slice(0, 10);
  }
  return getEvents();
}

/**
 * Sets events in queue.
 *
 * @param {Array<EPEvent>} newEvents
 */
export function setEvents(newEvents: Array<EPEvent>) {
  events = newEvents;
}

/**
 * Persists events in db.
 */
export async function persistEvents() {
  return db.setItem('events', getEvents());
}

/**
 * Removes events from the queue and persist queue.
 *
 * @param {Array<string>} idsToRemove
 */
export async function removeEvents(idsToRemove: Array<string>) {
  events = events.filter(event => !idsToRemove.includes(event.id));

  return persistEvents();
}

/**
 * Restores events from indexedDB and adds them to the queue.
 *
 * @returns {Promise<void>}
 */
async function restoreEvents(): Promise<void> {
  const storedEvents = await db.getItem<Array<EPEvent>>(
    'events',
    (error: Error) => {
      if (error) {
        console.error('Error in restoring events:', error);
        throw error;
      }
    },
  );
  if (storedEvents) {
    setEvents(getEvents().concat(storedEvents));
  }
}

/**
 * Init indexedDB and restore stored items
 *
 * @returns {Promise<void>}
 */
export const initDB = async (): Promise<void> => {
  await db.ready();
  await restoreEvents();
};

/**
 * Adds an event to the queue and persist queue.
 *
 * @param event
 *
 * @returns {Promise<Array<EPEvent>>}
 */
export async function addEvent(event: EPEvent): Promise<Array<EPEvent>> {
  events.push(event);
  return persistEvents();
}
