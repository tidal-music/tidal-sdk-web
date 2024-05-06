type MaybeEvent<P> =
  | {
      name: string;
      payload: P;
      streamingSessionId: string;
    }
  | undefined;

class EventSessionDB {
  #db: Map<string, any>;

  constructor() {
    this.#db = new Map();
  }

  async #generateCompositeKey(streamingSessionId: string, eventName: string) {
    const msgUint8 = new TextEncoder().encode(
      `${streamingSessionId}-${eventName}`,
    );
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hashHex;
  }

  /**
   * Delete a logged event by name and streamingSessionId.
   */
  async delete({
    name,
    streamingSessionId,
  }: {
    name: string;
    streamingSessionId: string;
  }): Promise<void> {
    const compositeKey = await this.#generateCompositeKey(
      streamingSessionId,
      name,
    );

    this.#db.delete(compositeKey);
  }

  /**
   * Get a logged event by name and streamingSessionId.
   */
  async get<P>({
    name,
    streamingSessionId,
  }: {
    name: string;
    streamingSessionId: string;
  }): Promise<MaybeEvent<P>> {
    const compositeKey = await this.#generateCompositeKey(
      streamingSessionId,
      name,
    );

    return this.#db.get(compositeKey);
  }

  /**
   * Adds or updates an event.
   */
  async put(value: {
    id?: unknown;
    name: string;
    payload: unknown;
    streamingSessionId: string;
  }): Promise<void> {
    const compositeKey = await this.#generateCompositeKey(
      value.streamingSessionId,
      value.name,
    );

    this.#db.set(compositeKey, value);
  }
}

export const db = new EventSessionDB();
