import type { EPEvent } from '../types';

import { db } from './db';

let isInitialized = false;

/**
 * Gets any stored events from db.
 *
 * @returns {Promise<Array<EPEvent> | undefined>}
 */
async function getStoredEvents(): Promise<Array<EPEvent> | undefined> {
  const storedEvents = await db.getItem<Array<EPEvent>>(
    'events',
    (error: Error) => {
      if (error) {
        console.error('Error in restoring events:', error);
        throw error;
      }
    },
  );
  return storedEvents ?? undefined;
}

/**
 * Inits localforage database and sets isInitialized to true.
 *
 * @returns {Promise<void>}
 */
export const initDB = async (): Promise<void> => {
  if (isInitialized) {
    return;
  }
  await db.ready();
  isInitialized = true;
};

type MessageParams = MessageEvent<
  | {
      action: 'init';
    }
  | {
      action: 'persist';
      events: Array<EPEvent>;
    }
>;

// eslint-disable-next-line no-restricted-globals
self.onmessage = async (message: MessageParams) => {
  const { data } = message;
  switch (data.action) {
    case 'persist':
      db.setItem('events', data.events).catch(console.error);
      break;
    case 'init': {
      await initDB();
      const events = await getStoredEvents();
      // eslint-disable-next-line no-restricted-globals
      self.postMessage({ action: 'initSuccess', events });
      break;
    }
  }
};
