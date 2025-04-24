import { db } from '../helpers/event-session';
import { eventSenderStore } from '../index';

type BaseCommitData = {
  group: string;
  name: string;
  payload: Record<string, unknown>;
  version: 1 | 2;
};

/**
 * Send event to event system scoped to streaming_metrics category.
 */
export async function commit(baseCommitData: BaseCommitData) {
  const event = {
    consentCategory: 'NECESSARY' as const,
    ...('extras' in baseCommitData && { extras: baseCommitData.extras }),
    group: baseCommitData.group,
    name: baseCommitData.name,
    payload: baseCommitData.payload,
    version: baseCommitData.version,
  };
  const streamingSessionId = event.payload.streamingSessionId as
    | string
    | undefined;

  // streamingSessionId not allowed in the progress event
  if (event.name === 'progress' && 'streamingSessionId' in event.payload) {
    delete event.payload.streamingSessionId;
  }

  eventSenderStore.eventSender.sendEvent(event);

  if (streamingSessionId) {
    await db.delete({
      name: event.name,
      streamingSessionId,
    });
  }
}
