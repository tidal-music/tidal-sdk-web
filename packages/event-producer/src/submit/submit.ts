import { IllegalArgumentError } from '@tidal-music/common';

import type { Config } from '../config';
import * as monitor from '../monitor';
import { isOutage, setOutage } from '../outage';
import * as queue from '../queue';
import type { EPEvent } from '../types';
import { eventsToSqsRequestParameters } from '../utils/sqsParamsConverter';

/**
 * Takes the first 10 events from the queue and sends them to backend.
 * Successful events are then removed from the queue.
 * Unsuccessful events are kept in the queue for later retry.
 *
 * If the backend service is not available we trigger an outage.
 *
 * @param {SubmitEventsParams} params
 */
type SubmitEventsParams = { config: Config };
export const submitEvents = async ({
  config,
}: SubmitEventsParams): Promise<void> => {
  const eventsBatch = queue.getEventBatch();
  if (eventsBatch.length === 0) {
    return Promise.resolve();
  }
  const headers = new Headers({
    Action: 'SendMessageBatch',
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
  const res = await fetch(uri, {
    body,
    headers,
    method: 'post',
  });
  if (res.ok) {
    if (isOutage()) {
      setOutage(false);
    }
    const respStr = await res.text();
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
      return submitEvents({ config });
    }
  } else {
    const respStr = await res.text();
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
