import * as Config from '../../config';

import { db } from './event-session';

export async function createReducer<P, N extends string>(
  eventName: N,
  defaultPayload: P,
) {
  if (!Config.get('gatherEvents')) {
    // @ts-expect-error - Not used
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (newData: { streamingSessionId: string } & Partial<P>) =>
      Promise.resolve(undefined);
  }

  return async (newData: { streamingSessionId: string } & Partial<P>) => {
    try {
      await db.put({
        name: eventName,
        payload: {
          ...defaultPayload,
          ...newData,
        },
        streamingSessionId: newData.streamingSessionId,
      });

      return db.get(eventName, newData.streamingSessionId);
    } catch (e) {
      console.error(e);
    }
  };
}
