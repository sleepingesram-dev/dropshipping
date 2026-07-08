// Applies schema.sql to DATABASE_URL. Safe to run repeatedly.
import { config } from '../config.js';
import { PgStore } from './pgStore.js';

if (!config.databaseUrl) {
  console.log('DATABASE_URL not set — nothing to migrate (file store needs no migration).');
  process.exit(0);
}

const store = new PgStore(config.databaseUrl);
await store.init();
console.log('Schema applied.');
await store.pool.end();
