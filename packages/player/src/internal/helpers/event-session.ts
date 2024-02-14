class EventSessionDB {
  // @ts-expect-error - Assigned.
  #db: IDBDatabase;

  constructor() {
    const name = 'streaming-sessions-' + crypto.randomUUID();
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
    };
  }

  delete({
    eventName,
    streamingSessionId,
  }: {
    eventName: string;
    streamingSessionId: string;
  }) {
    return new Promise((resolve, reject) => {
      // Open a transaction on the "events" store with readwrite permissions
      const transaction = this.#db.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');

      // Construct the composite key from eventName and streamingSessionId
      const compositeKey = [streamingSessionId, eventName].join('+');

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

  async get(eventName: string, streamingSessionId: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      // Open a transaction on the "events" store
      const transaction = this.#db.transaction(['events'], 'readonly');
      const store = transaction.objectStore('events');

      const compositeKey = [streamingSessionId, eventName].join('+');

      const request = store.get(compositeKey);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result); // Record found, resolve the promise with the record
        } else {
          resolve(null); // No record found with the composite key
        }
      };

      request.onerror = () => {
        console.error('Error in retrieving record:');
        reject(request.error);
      };
    });
  }

  put(value: {
    id?: unknown;
    name: string;
    payload: unknown;
    streamingSessionId: string;
  }) {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');

      value.id = [value.streamingSessionId, value.name].join('+');

      const request = store.put(value);

      request.onsuccess = event => resolve(event);

      request.onerror = event => reject(event);
    });
  }
}

export const db = new EventSessionDB();
