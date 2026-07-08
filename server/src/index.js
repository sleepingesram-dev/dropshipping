import { createApp } from './app.js';
import { config, integrationStatus } from './config.js';
import { getStore } from './store/index.js';
import { startScheduler } from './jobs/scheduler.js';

await getStore(); // initialize storage (applies Postgres schema when set)

const app = createApp();
app.listen(config.port, () => {
  const status = integrationStatus();
  console.log(`DropshipOS server on :${config.port}`);
  console.log('Integrations:', Object.entries(status).map(([k, v]) => `${k}=${v}`).join(' '));
  startScheduler();
});
