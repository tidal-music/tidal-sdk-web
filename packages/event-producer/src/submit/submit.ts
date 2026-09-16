import { IllegalArgumentError } from '@tidal-music/common';

import type { Config } from '../config.js';
import * as monitor from '../monitor/index.js';
import { isOutage, setOutage } from '../outage/index.js';
import * as queue from '../queue/index.js';
import type { EPEvent } from '../types.js';
import { eventsToSqsRequestParameters } from '../utils/sqsParamsConverter.js';

type SubmitEventsParams = { config: Config };

/**
 * Takes the first 10 events from the queue and sends them to backend, then
 * recurses until the queue is empty or a batch fails. See submitEvents.
 *
 * @param {SubmitEventsParams} params
 */
const submitBatchLoop = async ({
  config,
}: SubmitEventsParams): Promise<void> => {
  const eventsBatch = queue.getEventBatch();
  if (eventsBatch.length === 0) {
    return Promise.resolve();
  }
  const headers = new Headers({
    'Content-Type': 'application/x-www-form-urlencoded',
  });
  if (!config.credentialsProvider) {
    return Promise.reject(
      new IllegalArgumentError('CredentialsProvider not set'),
    );
  }
  const credentials = await config.credentialsProvider?.getCredentials();
  const accessToken = credentials.token;
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const uri = accessToken ? config.tlConsumerUri : config.tlPublicConsumerUri;
  const body = eventsToSqsRequestParameters(eventsBatch);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  let res: Response;
  let respStr: string;
  try {
    res = await fetch(uri, {
      body,
      headers,
      method: 'post',
      signal: controller.signal,
    });
    // Reading the body can fail like the request itself (stream error, abort);
    // treat both as a transport failure and keep the batch queued.
    respStr = await res.text();
  } catch {
    clearTimeout(timeoutId);
    setOutage(true);
    return;
  }
  clearTimeout(timeoutId);

  if (res.ok) {
    if (isOutage()) {
      setOutage(false);
    }
    const xml = new window.DOMParser().parseFromString(respStr, 'text/xml');
    const idsToRemove: Array<string> = [];
    xml
      .querySelectorAll(
        'SendMessageBatchResponse SendMessageBatchResult SendMessageBatchResultEntry Id',
      )
      .forEach(en => {
        if (en.textContent) {
          idsToRemove.push(en.textContent);
        }
      });

    xml
      .querySelectorAll(
        'SendMessageBatchResponse SendMessageBatchResult BatchResultErrorEntry',
      )
      .forEach(en => {
        const errorEventId = en.querySelector('Id')?.textContent;
        // SenderFault indicates the event is malformed and should be dropped.
        // see https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_BatchResultErrorEntry.html
        const isSenderFault =
          en.querySelector('SenderFault')?.textContent === 'true';
        if (errorEventId && isSenderFault) {
          idsToRemove.push(errorEventId);
          const droppedEv = eventsBatch.find(e => e.id === errorEventId);
          if (droppedEv) {
            monitor.registerDroppedEvent({
              eventName: droppedEv.name,
              reason: 'validationFailedEvents',
            });
          }
        }
      });
    queue.removeEvents(idsToRemove);
    if (queue.getEvents().length > 0) {
      return submitBatchLoop({ config });
    }
  } else {
    console.error('Error sending event batch:', respStr);
    setOutage(true);

    const xml = new window.DOMParser().parseFromString(respStr, 'text/xml');
    if (
      xml.querySelector('ErrorResponse Error Type')?.textContent === 'Sender'
    ) {
      // If the error is due to duplicate event ids, we dedupe the queue for next run.
      if (
        xml.querySelector('ErrorResponse Error Code')?.textContent ===
        'AWS.SimpleQueueService.BatchEntryIdsNotDistinct'
      ) {
        const currentEvents = queue.getEvents();
        const eventData: Record<string, EPEvent> = {};
        const uniqueIds = new Set(
          currentEvents.map(event => {
            eventData[event.id] = event;
            return event.id;
          }),
        );
        const dedupedEvents = Array.from(uniqueIds).map(
          id => eventData[id],
        ) as Array<EPEvent>;

        queue.setEvents(dedupedEvents);
      }
    }
  }
  return Promise.resolve();
};

/**
 * The currently running submit loop, if any. Makes submitEvents single-flight:
 * a scheduler tick or a flush() that arrives while a loop is already draining
 * the queue awaits that loop instead of starting a second one, which would
 * post the same batch twice.
 */
let inFlight: Promise<void> | null = null;

/**
 * Drains the queue in batches of 10, sending them to backend.
 * Successful events are removed from the queue.
 * Unsuccessful events are kept in the queue for later retry.
 *
 * If the backend service is not available we trigger an outage.
 *
 * Only one submit loop runs at a time; concurrent callers share the same promise.
 *
 * @param {SubmitEventsParams} params
 */
export const submitEvents = ({ config }: SubmitEventsParams): Promise<void> => {
  if (inFlight) {
    return inFlight;
  }
  inFlight = submitBatchLoop({ config }).finally(() => {
    inFlight = null;
  });
  return inFlight;
};
