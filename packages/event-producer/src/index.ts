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

export type FlushOptions = {
  /**
   * After submitting what can be submitted, discard whatever is still queued,
   * from memory and from IndexedDB, so nothing is left behind for the next
   * user.
   *
   * Discarded events are lost for good, including playback events that count
   * towards the user's listening history. Only set this when the outgoing
   * user's data must not remain on the device: signing out on a shared,
   * public or otherwise untrusted device, or switching to a different user's
   * profile. On a personal device prefer a plain flush(); leftover events are
   * delivered on a later run and stay attributed to the user who produced
   * them. Never call this on a schedule, at startup, on token refresh or as a
   * general clean-up.
   *
   * With this option set, flush() does not reject when submission fails
   * (e.g. no user is logged in any more); the unsent events are discarded and
   * reported in the result instead.
   */
  discardUnsent?: boolean;
};

export type FlushResult = {
  /** Number of queued events that could not be submitted and were discarded. */
  discarded: number;
};

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
 * With `{ discardUnsent: true }` whatever is still queued after the submit
 * attempt is dropped from memory and IndexedDB, and the promise resolves once
 * the store is confirmed empty. See FlushOptions.
 *
 * If a scheduled submit is already running, this awaits that run instead of
 * starting a second one.
 *
 * @param {FlushOptions} [options]
 * @returns {Promise<FlushResult>}
 */
export const flush = async (options?: FlushOptions): Promise<FlushResult> => {
  // Loop: a send that settles may have been queued behind another one.
  while (pendingSends.size > 0) {
    await Promise.allSettled(Array.from(pendingSends));
  }

  if (!options?.discardUnsent) {
    await submitEvents({ config: getConfig() });
    return { discarded: 0 };
  }

  try {
    await submitEvents({ config: getConfig() });
  } catch (error) {
    // Typically "nobody is logged in any more". The caller asked for nothing
    // to be left behind, so fall through to the discard instead of rejecting.
    console.error('flush: could not submit queued events:', error);
  }
  const discarded = await queue.clearEvents();
  monitor.resetMonitoringState();
  return { discarded };
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
    killQueue: () => flush({ discardUnsent: true }).catch(console.error),
    setOutage: outage.setOutage,
  };
}
/* c8 ignore stop */
