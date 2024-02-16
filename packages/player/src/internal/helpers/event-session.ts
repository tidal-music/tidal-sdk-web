class EventSessionDB {
  // @ts-expect-error - Assigned.
  #db: IDBDatabase;

  constructor() {
    this.#removeOldDatabase();

    const uuid = crypto.randomUUID();
    const name = 'streaming-sessions-' + uuid;
    const openRequest = indexedDB.open(name, 1);

    openRequest.onupgradeneeded = () => {
      this.#db = openRequest.result;

      if (!this.#db.objectStoreNames.contains('events')) {
        const objectStore = this.#db.createObjectStore('events', {
          keyPath: 'id',
        });
        objectStore.createIndex('streamingSessionId', 'streamingSessionId');
      }
    };

    openRequest.onsuccess = () => {
      this.#db = openRequest.result;
      localStorage.setItem('ssuid', uuid);
    };
  }

  async #generateCompositeKey(streamingSessionId: string, eventName: string) {
    const msgUint8 = new TextEncoder().encode(
      `${streamingSessionId}-${eventName}`,
    ); // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8); // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''); // convert bytes to hex string

    return hashHex;
  }

  #removeOldDatabase() {
    const ssuid = localStorage.getItem('ssuid');

    if (ssuid) {
      indexedDB.deleteDatabase('streaming-sessions-' + ssuid);
    }
  }

  async clean({ streamingSessionId }: { streamingSessionId: string }) {
    console.log('clean out ' + streamingSessionId);

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');
      const index = store.index('streamingSessionId');
      const request = index.openCursor(IDBKeyRange.only(streamingSessionId));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve('Events deleted successfully.');
        }
      };

      request.onerror = () => {
        console.error('Error in cleaning events:');
        reject(request.error);
      };
    });
  }

  async delete({
    name,
    streamingSessionId,
  }: {
    name: string;
    streamingSessionId: string;
  }) {
    const compositeKey = await this.#generateCompositeKey(
      streamingSessionId,
      name,
    );

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');

      // Use the delete method with the composite key to delete the record
      const request = store.delete(compositeKey);

      request.onsuccess = () => {
        resolve('Event deleted successfully.');
      };

      request.onerror = () => {
        console.error('Error in deleting event:');
        reject(request.error);
      };
    });
  }

  async get<P>({
    name,
    streamingSessionId,
  }: {
    name: string;
    streamingSessionId: string;
  }): Promise<
    | {
        name: string;
        payload: P;
        streamingSessionId: string;
      }
    | undefined
  > {
    const compositeKey = await this.#generateCompositeKey(
      streamingSessionId,
      name,
    );

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(['events'], 'readonly');
      const store = transaction.objectStore('events');
      const request = store.get(compositeKey);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result); // Record found, resolve the promise with the record
        } else {
          resolve(undefined); // No record found with the composite key
        }
      };

      request.onerror = () => {
        console.error('Error in retrieving record:');
        reject(request.error);
      };
    });
  }

  async put(value: {
    id?: unknown;
    name: string;
    payload: unknown;
    streamingSessionId: string;
  }) {
    const compositeKey = await this.#generateCompositeKey(
      value.streamingSessionId,
      value.name,
    );

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');

      value.id = compositeKey;

      const request = store.put(value);

      request.onsuccess = event => resolve(event);

      request.onerror = event => reject(event);
    });
  }
}

export const db = new EventSessionDB();
