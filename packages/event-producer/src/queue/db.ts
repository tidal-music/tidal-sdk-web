import localforage from 'localforage';

export const db = localforage.createInstance({
  driver: localforage.INDEXEDDB,
  name: 'EventProducerDB',
  version: 1,
});
