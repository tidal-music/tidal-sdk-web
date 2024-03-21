import type { EventSender } from '@tidal-music/common';

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
