import type { CredentialsProvider } from '@tidal-music/common';
import { trueTime } from '@tidal-music/true-time';

import type { Config } from '../config';
import * as monitor from '../monitor';
import * as queue from '../queue';
import type { DispatchedEvent, EPEvent } from '../types';
import { getEventHeaders } from '../utils/headerUtils';
import { validateEvent } from '../utils/validateEvent';
import { uuid } from '../uuid/uuid';

/**
 * Creates an EPEvent to be sent to the event producer
 *
 * @param {DispatchEventParams} params
 *
 * @returns {Promise<EPEvent>}
 */
const createEvent = async ({
  config,
  credentialsProvider,
  event,
}: DispatchEventParams): Promise<EPEvent> => {
  const { consentCategory, headers: suppliedHeaders, name } = event;
  const headers = getEventHeaders({
    appInfo: config.appInfo,
    consentCategory,
    credentials: await credentialsProvider?.getCredentials(),
    platformData: config.platform,
    sentTimestamp: trueTime.now().toString(),
    suppliedHeaders,
  });
  return {
    headers,
    id: uuid(),
    name,
    payload: JSON.stringify(event),
  };
};

/* c8 ignore start debug only */
export const strictEventCheck = (event: DispatchedEvent) => {
  if (!event.payload) {
    throw new Error(`Event is missing payload!: ${JSON.stringify(event)}`);
  }
  if (!event.name) {
    throw new Error(`Event is missing name! ${JSON.stringify(event)}`);
  }
  if (!event.consentCategory) {
    throw new Error(
      `Event is missing consentCategory! ${JSON.stringify(event)}`,
    );
  }
};
/* c8 ignore stop */

export type DispatchEventParams = {
  config: Config;
  credentialsProvider: CredentialsProvider;
  event: DispatchedEvent;
};

/**
 * Receives an event, validates it, converts it to an EPEvent, and adds it to the queue
 *
 * @param {DispatchEventParams} params
 *
 * @returns {Promise<void | EPEvent[]>}
 */
export const dispatchEvent = async ({
  config,
  credentialsProvider,
  event: dispatchedEvent,
}: DispatchEventParams): Promise<Array<EPEvent> | void> => {
  /* c8 ignore start debug only */
  if (config.strictMode) {
    strictEventCheck(dispatchedEvent);
  }
  /* c8 ignore stop */
  if (config.blacklistedConsentCategories[dispatchedEvent.consentCategory]) {
    monitor.registerDroppedEvent({
      eventName: dispatchedEvent.name,
      reason: 'consentFilteredEvents',
    });
    return Promise.resolve();
  }
  const event = await createEvent({
    config,
    credentialsProvider,
    event: dispatchedEvent,
  });

  if (validateEvent(event)) {
    return queue.addEvent(event);
  }

  return Promise.resolve();
};
