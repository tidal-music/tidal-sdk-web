import { IllegalArgumentError } from '@tidal-music/common';

import * as bus from './bus';
import type { Config } from './config';
import { getConfig } from './config';
import { init as _init } from './init';
import * as monitor from './monitor';
import * as outage from './outage';
import * as queue from './queue/queue';
import * as send from './send/send';
import { submitEvents } from './submit/submit';
import type { SentEvent } from './types';

export {
  getConfig,
  setConsentCategory,
  setCredentialsProvider,
} from './config';
export type * from './types';

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
    send
      .sendEvent({
        config,
        credentialsProvider,
        event,
      })
      .catch(console.error);
  } else {
    // TODO: Is this the right error to throw?
    throw new IllegalArgumentError('CredentialsProvider not set');
  }
};

export const init = (config: Config) => _init(config);

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
    flushEvents: () =>
      submitEvents({ config: getConfig() }).catch(console.error),
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
