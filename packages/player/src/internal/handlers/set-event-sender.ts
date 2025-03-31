import type * as _EventSender from '@tidal-music/event-producer';

type EventSender = typeof _EventSender;

import { eventSenderStore } from '../index';

/**
 * Set the event sender TIDAL Player SDK should use for sending events.
 *
 * @param {EventSender} newEventSender
 */
export function setEventSender(newEventSender: EventSender) {
  eventSenderStore.eventSender = newEventSender;
}
