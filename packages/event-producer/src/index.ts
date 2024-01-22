import { IllegalArgumentError } from '@tidal-music/common';

import * as bus from './bus';
import type { Config } from './config';
import { getConfig } from './config';
import * as dispatch from './dispatch/dispatch';
import { init as _init } from './init';
import * as monitor from './monitor';
import * as outage from './outage';
import * as queue from './queue/queue';
import { submitEvents } from './submit/submit';
import type { DispatchedEvent } from './types';

export { setCredentialsProvider } from './config';
export type * from './types';

/**
 * This is the user exposed function that wraps dispatchEvent with the config and credentialsProvider.
 *
 * @param {DispatchedEvent} event The event to add to the queue
 */
// TODO: error handling.
export const dispatchEvent = (event: DispatchedEvent) => {
  const config = getConfig();
  const { credentialsProvider } = config;
  if (!credentialsProvider) {
    // TODO: Is this the right error to throw?
    throw new IllegalArgumentError('CredentialsProvider not set');
  }
  dispatch
    .dispatchEvent({
      config,
      credentialsProvider,
      event,
    })
    .catch(console.error);
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
      await queue.persistEvents();
    },
    setOutage: outage.setOutage,
  };
}
/* c8 ignore stop */
