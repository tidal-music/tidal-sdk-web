import type { Bus, BusEvent, TidalMessage } from '@tidal-music/common';

import { OutageStartError } from './outage';

/**
 * The bus used by the EventSender for all "asynchronous" communication.
 *
 * @param {(e: BusEvent) => void} callbackFn
 */
export const bus: Bus = (callbackFn: (e: BusEvent) => void) => {
  return globalThis.addEventListener(
    'eventProducerEventBus',
    callbackFn as EventListener,
  );
};

// TODO: Rewrite to use BroadcastChannel instead of CustomEvent.
/**
 * Posts a message to the bus.
 *
 * @param {OutageStartError | TidalMessage} message
 */
export const postMessage = (message: OutageStartError | TidalMessage) => {
  const event = new CustomEvent('eventProducerEventBus', {
    detail: message,
  });
  globalThis.dispatchEvent(event);
};
