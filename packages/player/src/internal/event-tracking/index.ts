import { eventSenderStore } from '../index';

import type { CommitData } from './types';

/**
 * Send event to event system scoped to streaming_metrics category.
 */
export async function commit(data: Pick<CommitData, 'events'>) {
  for await (const event of data.events) {
    if (event) {
      eventSenderStore.eventSender.sendEvent({
        ...event,
        consentCategory: 'NECESSARY',
      });
    }
  }
}
