import * as Config from '../../config';

import { db } from './event-session';

export async function createReducer<P, N extends string>(
  name: N,
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
      const savedEvent = await db.get<P>({
        name,
        streamingSessionId: newData.streamingSessionId,
      });

      const payload = Object.assign(
        {},
        defaultPayload,
        savedEvent ? savedEvent.payload : {},
        newData,
      ) as P;

      for (const k of Object.keys(newData)) {
        const key = k as keyof Partial<P>;

        if (Array.isArray(newData[key])) {
          payload[key] = [
            ...((defaultPayload[key] as Array<any>) || []),
            ...((savedEvent && (savedEvent.payload[key] as Array<any>)) || []),
            ...((newData[key] as Array<any>) || []),
          ] as P[typeof key];
        }
      }

      await db.put({
        name,
        payload,
        streamingSessionId: newData.streamingSessionId,
      });

      return {
        name,
        payload,
        streamingSessionId: newData.streamingSessionId,
      };
    } catch (e) {
      console.error(e);
    }
  };
}
