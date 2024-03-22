import * as Config from '../../config';
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
  const credentials =
    await credentialsProviderStore.credentialsProvider.getCredentials();

  eventSenderStore.eventSender.sendEvent({
    // @ts-expect-error required but not in the spec :(
    client: {
      platform: Config.get('clientPlatform'),
      token: credentials.clientId,
      version: Config.get('appVersion'),
    },
    consentCategory: 'NECESSARY',
    group: baseCommitData.group,
    name: baseCommitData.name,
    payload: baseCommitData.payload,
    user: {
      accessToken: credentials.token,
      clientId: credentials.clientId,
      id: credentials.userId,
    },
    version: baseCommitData.version,
  });
}
