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
  // @ts-expect-error - Assigned through private method #init.
  #name: string;
  #openingDatabase: Promise<void> | undefined;

  constructor() {
    this.#createNewDatabase().catch(console.error);
  }

  /**
   * Create a new database and set the #openingDatabase promise to undefined when it's done.
   */
  async #createNewDatabase() {
    this.#openingDatabase = this.#init().then(() => {
      this.#openingDatabase = undefined;
    });

    return this.#openingDatabase;
  }

  /**
   * Ensure that the database is open and ready to use. Using a promise to
   * debounce multiple calls to this method.
   */
  async #ensureDatabase() {
    const isExisting = (await window.indexedDB.databases())
      .map(db => db.name)
      .includes(this.#name);

    if (this.#openingDatabase) {
      await this.#openingDatabase;
    } else if (!isExisting) {
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
      this.#name = name;
      const request = indexedDB.open(name, 1);

      request.onupgradeneeded = () => {
        this.#db = request.result;

        if (!this.#db.objectStoreNames.contains('events')) {
          this.#db.createObjectStore('events', {
            keyPath: 'id',
          });
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
    await this.#ensureDatabase();

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
    await this.#ensureDatabase();

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
            resolve(request.result as MaybeEvent<P>);
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

  /**
   * Adds or updates an event.
   */
  async put(value: {
    id?: unknown;
    name: string;
    payload: unknown;
    streamingSessionId: string;
  }): Promise<void> {
    await this.#ensureDatabase();

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
