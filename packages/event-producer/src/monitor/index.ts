import { trueTime } from '@tidal-music/true-time';

import { getConfig } from '../config';
import type { EPEvent } from '../types';
import { getEventHeaders } from '../utils/headerUtils';
import { eventsToSqsRequestParameters } from '../utils/sqsParamsConverter';
import { uuid } from '../uuid/uuid';

type MonitoringInformation = {
  /**
   * Each map maps an event name to a counter. The counter indicates how many events of a certain type
   * that was dropped due to filtering, validation or storing issues respectively
   */
  consentFilteredEvents: Record<string, number>;
  storingFailedEvents: Record<string, number>;
  validationFailedEvents: Record<string, number>;
};

type Reason = keyof MonitoringInformation;

export let _monitoringInfo: MonitoringInformation = {
  consentFilteredEvents: {},
  storingFailedEvents: {},
  validationFailedEvents: {},
};

export const resetMonitoringState = () => {
  _monitoringInfo.consentFilteredEvents = {};
  _monitoringInfo.storingFailedEvents = {};
  _monitoringInfo.validationFailedEvents = {};
};

type RegisterDropEventParams = {
  eventName: string;
  reason: Reason;
};

/**
 * Registers a dropped event.
 *
 * @param {RegisterDropEventParams} payload
 */
export const registerDroppedEvent = ({
  eventName,
  reason,
}: RegisterDropEventParams) => {
  const previousCount = _monitoringInfo[reason][eventName] ?? 0;
  _monitoringInfo[reason][eventName] = previousCount + 1;
};

const hasDroppedEvents = () =>
  Object.keys(_monitoringInfo.consentFilteredEvents).length +
    Object.keys(_monitoringInfo.storingFailedEvents).length +
    Object.keys(_monitoringInfo.validationFailedEvents).length >
  0;

/**
 * Sends monitoring information to backend.
 */
export const sendMonitoringInfo = async () => {
  if (hasDroppedEvents()) {
    const config = getConfig();
    if (!config.credentialsProvider) {
      throw new Error('CredentialsProvider not set');
    }

    const headers = new Headers({
      Action: 'SendMessageBatch',
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    const monitoringEvent: EPEvent = {
      headers: getEventHeaders({
        appInfo: config.appInfo,
        authorize: false,
        consentCategory: 'NECESSARY',
        credentials: await config.credentialsProvider?.getCredentials(),
        platformData: config.platform,
        sentTimestamp: trueTime.now(),
      }),
      id: uuid(),
      name: 'tep-tl-monitoring',
      payload: JSON.stringify(_monitoringInfo),
    };
    // @ts-expect-error just for debugging
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (globalThis.__tepTlDebug?.debug) {
      // eslint-disable-next-line no-console
      console.log('monitoringEvent sendt:', monitoringEvent);
    }
    const body = eventsToSqsRequestParameters([monitoringEvent]);
    fetch(config.tlPublicConsumerUri, {
      body,
      headers,
      method: 'post',
    }).catch(console.error);
    // we don't care if the request fails, we treat monitoring as a heart beat. So we reset the state after sending
    resetMonitoringState();
  }
  return Promise.resolve();
};
