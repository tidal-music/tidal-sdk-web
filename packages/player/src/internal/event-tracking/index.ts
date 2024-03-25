import { db } from '../helpers/event-session';
import { credentialsProviderStore, eventSenderStore } from '../index';

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
  /*
    This is a workaround to keep the old nested header structure,
    turn off when we can rely on the header enrichment solely.
  */
  const oldNestedHeader = true;
  const event = {
    consentCategory: 'NECESSARY' as const,
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

  if (oldNestedHeader) {
    const credentials =
      await credentialsProviderStore.credentialsProvider.getCredentials();

    const config = eventSenderStore.eventSender.getConfig();

    // @ts-expect-error - client field in spec, but required apparently...
    event.client = {
      platform: config.platform,
      token: credentials.clientId,
      version: config.appInfo.appVersion,
    };

    // @ts-expect-error - user field in spec, but required apparently...
    event.user = {
      accessToken: credentials.token,
      clientId: credentials.clientId,
      id: credentials.userId,
    };
  }

  eventSenderStore.eventSender.sendEvent(event);

  if (streamingSessionId) {
    await db.delete({
      name: event.name,
      streamingSessionId,
    });
  }
}
