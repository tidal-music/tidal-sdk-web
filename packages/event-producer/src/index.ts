import { IllegalArgumentError } from '@tidal-music/common';

import * as bus from './bus.js';
import type { Config } from './config.js';
import { getConfig } from './config.js';
import { init as _init } from './init.js';
import * as monitor from './monitor/index.js';
import * as outage from './outage/index.js';
import * as queue from './queue/queue.js';
import * as send from './send/send.js';
import { submitEvents } from './submit/submit.js';
import type { SentEvent } from './types.js';

export {
  getConfig,
  setConsentCategory,
  setCredentialsProvider,
} from './config.js';
export type * from './types.js';

/**
 * Events handed to sendEvent that have not yet reached the queue (sendEvent
 * awaits getCredentials() before enqueueing). flush() waits for these so an
 * event produced right before a flush is included in it.
 */
const pendingSends = new Set<Promise<unknown>>();

/**
 * This is the user exposed function that wraps sendEvent with the config and credentialsProvider.
 *
 * @param {SentEvent} event The event to add to the queue
 */
// TODO: error handling.
export const sendEvent = (event: SentEvent) => {
  const config = getConfig();
  const { credentialsProvider } = config;
  if (credentialsProvider) {
    const pending = send
      .sendEvent({
        config,
        credentialsProvider,
        event,
      })
      .catch(console.error)
      .finally(() => {
        pendingSends.delete(pending);
      });
    pendingSends.add(pending);
  } else {
    // TODO: Is this the right error to throw?
    throw new IllegalArgumentError('CredentialsProvider not set');
  }
};

export const init = (config: Config) => _init(config);

/**
 * Submits all queued events now, batch by batch, using the current credentials.
 *
 * Call this before logging out or switching user so the active user's queued
 * events are delivered while their credentials are still available.
 *
 * Waits for any sendEvent() calls that have not yet reached the queue, then
 * submits. Resolves when the queue is empty or a batch fails (outage / non-OK
 * response); in the failure case the remaining events stay queued and are
 * retried by the scheduler. Rejects if no credentialsProvider is set or
 * getCredentials() rejects.
 *
 * If a scheduled submit is already running, this awaits that run instead of
 * starting a second one.
 *
 * @returns {Promise<void>}
 */
export const flush = async (): Promise<void> => {
  // Loop: a send that settles may have been queued behind another one.
  while (pendingSends.size > 0) {
    await Promise.allSettled(Array.from(pendingSends));
  }
  return submitEvents({ config: getConfig() });
};

export { bus };

/* c8 ignore start debug only */
if (import.meta.env.DEV) {
  // @ts-expect-error dev builds only
  globalThis.__tepDebug = {
    bus,
    dropEvent: () => {
      monitor.registerDroppedEvent({
        eventName: 'bacon',
        reason: 'consentFilteredEvents',
      });
    },
    dumpConfig: () => getConfig(),
    flushEvents: () => flush().catch(console.error),
    flushMonitoring: monitor.sendMonitoringInfo,
    getEvents: queue.getEvents,
    killQueue: async () => {
      queue.setEvents([]);
      queue.persistEvents();
    },
    setOutage: outage.setOutage,
  };
}
/* c8 ignore stop */
