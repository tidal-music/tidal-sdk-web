import type * as _EventSender from '@tidal-music/event-producer';

type EventSender = typeof _EventSender;

import { eventSenderStore } from '../index';

/**
 * Set the credentials provider TIDAL Player SDK should use for getting
 * session information
 *
 * @param {CredentialsProvider} newCredentialsProvider
 */
export function setEventSender(newEventSender: EventSender) {
  eventSenderStore.eventSender = newEventSender;
}
