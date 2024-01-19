import { get, set } from 'idb-keyval';

import * as Config from '../../config';

export async function createReducer<P, N extends string>(
  eventName: N,
  defaultPayload: P,
) {
  let events = new Map<string, P>();

  let storedItem;

  if (!Config.get('gatherEvents')) {
    // @ts-expect-error - Not used
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (newData: { streamingSessionId: string } & Partial<P>) =>
      Promise.resolve(undefined);
  }

  // sessionStorage can be unavailable in for example iframes for embed player.
  try {
    storedItem = await get(eventName);

    if (storedItem) {
      events = new Map(storedItem);
    }
  } catch (e) {
    console.error(e);
  }

  return async (newData: { streamingSessionId: string } & Partial<P>) => {
    const oldPayload = events.get(newData.streamingSessionId) || defaultPayload;
    const updatedPayload = {
      ...oldPayload,
      ...newData,
    } as P;

    for (const k of Object.keys(newData)) {
      const key = k as keyof Partial<P>;

      if (Array.isArray(newData[key])) {
        updatedPayload[key] = [
          ...((oldPayload[key] as Array<any>) || []),
          ...((newData[key] as Array<any>) || []),
        ] as P[typeof key];
      }
    }

    events.set(newData.streamingSessionId, updatedPayload);

    try {
      await set(eventName, [...events]);
    } catch (e) {
      console.error(e);
    }

    return {
      name: eventName,
      payload: updatedPayload,
    };
  };
}
