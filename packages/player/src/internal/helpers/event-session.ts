type MaybeEvent<P> =
  | {
      name: string;
      payload: P;
      streamingSessionId: string;
    }
  | undefined;

class EventSessionDB {
  // @ts-expect-error - Assigned through private method #init.
  #db: IDBDatabase;
  #openingDatabase: Promise<void> | undefined;

  constructor() {
    this.#createNewDatabase().catch(console.error);
  }

  async #createNewDatabase() {
    this.#openingDatabase = this.#init().then(() => {
      this.#openingDatabase = undefined;
    });

    return this.#openingDatabase;
  }

  async #ensureDatabase() {
    if (this.#openingDatabase) {
      await this.#openingDatabase;
    } else {
      await this.#createNewDatabase();
    }
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

  async #init() {
    return new Promise<void>((resolve, reject) => {
      this.#removeOldDatabase();

      const uuid = crypto.randomUUID();
      const name = 'streaming-sessions-' + uuid;
      const request = indexedDB.open(name, 1);

      request.onupgradeneeded = () => {
        this.#db = request.result;

        if (!this.#db.objectStoreNames.contains('events')) {
          const objectStore = this.#db.createObjectStore('events', {
            keyPath: 'id',
          });
          objectStore.createIndex('streamingSessionId', 'streamingSessionId');
        }
      };

      request.onsuccess = () => {
        this.#db = request.result;
        localStorage.setItem('ssuid', uuid);

        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  #removeOldDatabase() {
    const ssuid = localStorage.getItem('ssuid');

    if (ssuid) {
      indexedDB.deleteDatabase('streaming-sessions-' + ssuid);
    }
  }

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

    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = this.#db.transaction(['events'], 'readwrite');
        const store = transaction.objectStore('events');
        const request = store.delete(compositeKey);

        request.onsuccess = () => resolve();

        request.onerror = () => {
          throw request.error;
        };
      } catch (error) {
        reject(error);
      }
    }).catch(async error => {
      if (
        error instanceof DOMException &&
        error.message.includes('The database connection is closing')
      ) {
        await this.#ensureDatabase();
        return this.delete({
          name,
          streamingSessionId,
        });
      }
    });
  }

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

    return new Promise<MaybeEvent<P>>((resolve, reject) => {
      try {
        const transaction = this.#db.transaction(['events'], 'readonly');
        const store = transaction.objectStore('events');
        const request = store.get(compositeKey);

        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            resolve(undefined);
          }
        };

        request.onerror = () => {
          throw request.error;
        };
      } catch (error) {
        reject(error);
      }
    }).catch(async error => {
      if (
        error instanceof DOMException &&
        error.message.includes('The database connection is closing')
      ) {
        await this.#ensureDatabase();

        return this.get<P>({
          name,
          streamingSessionId,
        });
      }
    });
  }

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

    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = this.#db.transaction(['events'], 'readwrite');
        const store = transaction.objectStore('events');

        value.id = compositeKey;

        const request = store.put(value);

        request.onsuccess = () => resolve();

        request.onerror = () => {
          throw request.error;
        };
      } catch (error) {
        reject(error);
      }
    }).catch(async error => {
      if (
        error instanceof DOMException &&
        error.message.includes('The database connection is closing')
      ) {
        await this.#ensureDatabase();

        return this.put(value);
      }
    });
  }
}

export const db = new EventSessionDB();
