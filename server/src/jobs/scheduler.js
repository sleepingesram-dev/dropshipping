import { getStore } from '../store/index.js';
import { runAutomation } from '../services/automations.js';

// Minute-tick scheduler: runs each enabled automation when its interval has
// elapsed since lastRunAt. Intervals are minutes, not cron — coarse on
// purpose; anything time-critical (order placement) is event-driven upstream.
const TICK_MS = 60_000;
let timer = null;

async function tick() {
  const store = await getStore();
  const automations = await store.listAutomations();
  const now = Date.now();
  for (const a of automations) {
    if (!a.enabled) continue;
    const last = a.lastRunAt ? Date.parse(a.lastRunAt) : 0;
    if (now - last >= a.intervalMinutes * 60_000) {
      await runAutomation(a.id, { trigger: 'schedule' }).catch((err) => {
        console.error(`[scheduler] ${a.id}:`, err.message);
      });
    }
  }
}

export function startScheduler() {
  if (timer) return;
  tick().catch((err) => console.error('[scheduler] first tick:', err.message));
  timer = setInterval(() => tick().catch((err) => console.error('[scheduler]', err.message)), TICK_MS);
  timer.unref?.();
  console.log('[scheduler] started (60s tick)');
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
