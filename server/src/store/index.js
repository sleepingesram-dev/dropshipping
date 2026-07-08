import { config } from '../config.js';
import { FileStore } from './fileStore.js';
import { PgStore } from './pgStore.js';

let storePromise;

export function getStore() {
  if (!storePromise) {
    const store = config.databaseUrl ? new PgStore(config.databaseUrl) : new FileStore();
    storePromise = store.init();
  }
  return storePromise;
}
