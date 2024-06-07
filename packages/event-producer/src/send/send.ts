import type { CredentialsProvider } from '@tidal-music/common';
import { trueTime } from '@tidal-music/true-time';

import type { Config } from '../config';
import * as monitor from '../monitor';
import * as queue from '../queue';
import type { EPEvent, SentEvent } from '../types';
import { getEventHeaders } from '../utils/headerUtils';
import { validateEvent } from '../utils/validateEvent';
import { uuid } from '../uuid/uuid';

type CreatePayloadParams = {
  event: SentEvent;
  id: string;
  ts: number;
};
/**
 * Creates a payload to be sent to backend. The payload is the whole raw event with uuid
 * and timestamp added but the consentCategory omitted.
 *
 * @param {CreatePayloadParams} payloadParams
 * @returns {string}
 */
const createPayload = ({ event, id, ts }: CreatePayloadParams): string => {
  const { consentCategory, ...rawEventWithoutConsentCategory } = event;

  return JSON.stringify({ ...rawEventWithoutConsentCategory, ts, uuid: id });
};

/**
 * Creates an EPEvent to be sent to the event producer
 *
 * @param {SendEventParams} params
 *
 * @returns {Promise<EPEvent>}
 */
const createEvent = async ({
  config,
  credentialsProvider,
  event,
}: SendEventParams): Promise<EPEvent> => {
  const id = uuid();
  const sentTimestamp = trueTime.now();
  const headers = getEventHeaders({
    appInfo: config.appInfo,
    consentCategory: event.consentCategory,
    credentials: await credentialsProvider?.getCredentials(),
    platformData: config.platform,
    sentTimestamp,
    suppliedHeaders: event.headers,
  });
  return {
    headers,
    id,
    name: event.name,
    payload: createPayload({
      event,
      id,
      ts: sentTimestamp,
    }),
  };
};

/* c8 ignore start debug only */
export const strictEventCheck = (event: SentEvent) => {
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

export type SendEventParams = {
  config: Config;
  credentialsProvider: CredentialsProvider;
  event: SentEvent;
};

/**
 * Receives an event, validates it, converts it to an EPEvent, and adds it to the queue
 *
 * @param {SendEventParams} params
 *
 * @returns {Promise<void | EPEvent[]>}
 */
export const sendEvent = async ({
  config,
  credentialsProvider,
  event: sentEvent,
}: SendEventParams): Promise<Array<EPEvent> | void> => {
  /* c8 ignore start debug only */
  if (config.strictMode) {
    strictEventCheck(sentEvent);
  }
  /* c8 ignore stop */
  if (config.blockedConsentCategories[sentEvent.consentCategory]) {
    monitor.registerDroppedEvent({
      eventName: sentEvent.name,
      reason: 'consentFilteredEvents',
    });
    return Promise.resolve();
  }
  const event = await createEvent({
    config,
    credentialsProvider,
    event: sentEvent,
  });

  if (validateEvent(event)) {
    return queue.addEvent(event);
  }

  return Promise.resolve();
};
