import { IllegalArgumentError } from '@tidal-music/common';

import type { Config } from '../config';
// import * as monitor from '../monitor';
import { isOutage, setOutage } from '../outage';
import * as queue from '../queue';
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
export const submitEvents = async ({ config }: SubmitEventsParams) => {
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

    /** TODO: yell about this edgecase
    xml
      .querySelectorAll(
        'SendMessageBatchResponse SendMessageBatchResult Error Id',
      )
      .forEach(en => {
        if (en.textContent) {
          idsToRemove.push(en.textContent);
        }
        const droppedEv = eventsBatch.find(e => e.id === en.textContent);
        if (droppedEv) {
          monitor.registerDroppedEvent({
            name: droppedEv.name,
            reason: 'validation',
          });
        }
      });
    */
    return queue.removeEvents(idsToRemove);
  } else {
    setOutage(true);
    // TODO: monitor.registerDroppedEvent() network error type is missing from spec
  }
  return Promise.resolve();
};
