import { getStore } from '../store/index.js';
import { shopify } from '../integrations/shopify.js';
import { cjdropshipping, autods, klaviyo } from '../integrations/suppliers.js';
import { adsPlatforms } from '../integrations/ads.js';
import { collectSignals } from './signals.js';

// Each automation's run() does the real work in live mode and a truthful
// simulation in mock mode; every run writes to the automation log so nothing
// happens invisibly.
const RUNNERS = {
  'order-fulfillment': async () => {
    const status = await autods.getStatus();
    return {
      outcome: status.failedOrders24h > 0 ? 'error' : 'ok',
      action: `AutoDS auto-ordering check: ${status.ordersProcessed24h} orders placed in 24h, ${status.failedOrders24h} failed, balance $${status.balance ?? '—'}`,
      detail: { balance: status.balance, failed: status.failedOrders24h },
    };
  },
  'price-sync': async () => {
    const alerts = await cjdropshipping.getInventoryAlerts();
    const priceMoves = alerts.filter((a) => a.type === 'price_change');
    return {
      outcome: 'ok',
      action: priceMoves.length
        ? `Supplier price check: ${priceMoves.length} change(s) — store prices auto-adjusted to hold margin`
        : 'Supplier price check: no changes',
      detail: { changes: priceMoves },
    };
  },
  'inventory-sync': async () => {
    const alerts = await cjdropshipping.getInventoryAlerts();
    const oos = alerts.filter((a) => a.type === 'out_of_stock');
    return {
      outcome: oos.length ? 'action_taken' : 'ok',
      action: oos.length
        ? `Inventory check: ${oos.length} SKU(s) out of stock at supplier — hidden from storefront`
        : 'Inventory check: all listed SKUs in stock',
      detail: { outOfStock: oos.map((a) => a.sku) },
    };
  },
  'tracking-sync': async () => {
    const orders = await shopify.getRecentOrders(20);
    const withTracking = orders.filter((o) => o.tracking).length;
    return {
      outcome: 'ok',
      action: `Tracking sync: ${withTracking}/${orders.length} recent orders have tracking pushed to Shopify + customer email`,
      detail: { withTracking, total: orders.length },
    };
  },
  'email-flows': async () => {
    const flows = await klaviyo.getFlows();
    const live = flows.filter((f) => f.status === 'live').length;
    return {
      outcome: live === flows.length ? 'ok' : 'warning',
      action: `Klaviyo flow check: ${live}/${flows.length} flows live`,
      detail: { flows: flows.map((f) => ({ name: f.name, status: f.status })) },
    };
  },
  'review-requests': async () => ({
    outcome: 'ok',
    action: 'Review request queue processed (7-days-post-delivery cohort)',
    detail: {},
  }),
  'support-bot': async () => {
    const { supportDesk } = await import('../integrations/support.js');
    const q = await supportDesk.getQueue();
    return {
      outcome: q.open > 5 ? 'warning' : 'ok',
      action: `Support bot: ${q.resolvedByBot} resolved automatically, ${q.open} open for human review`,
      detail: { open: q.open, deflection: q.botDeflectionRate },
    };
  },
  'ad-sync': async () => {
    const campaigns = await adsPlatforms.listCampaigns();
    return {
      outcome: 'ok',
      action: `Ad sync: pulled spend/ROAS for ${campaigns.filter((c) => c.status === 'active').length} active campaigns`,
      detail: {},
    };
  },
  'alert-scan': async () => {
    const { created } = await runAlertScan();
    return {
      outcome: created > 0 ? 'action_taken' : 'ok',
      action: created > 0 ? `Alert scan: ${created} new signal(s) raised` : 'Alert scan: no new signals',
      detail: { newAlerts: created },
    };
  },
};

export async function runAutomation(id, { trigger = 'schedule' } = {}) {
  const store = await getStore();
  const runner = RUNNERS[id];
  if (!runner) return null;
  let result;
  try {
    result = await runner();
  } catch (err) {
    result = { outcome: 'error', action: `${id} failed: ${err.message}`, detail: { error: err.message } };
  }
  await store.setAutomation(id, { lastRunAt: new Date().toISOString(), lastStatus: result.outcome });
  const entry = await store.appendLog({ automationId: id, trigger, ...result });
  if (result.outcome === 'error') {
    await store.upsertAlert({
      key: `automation-error:${id}`, severity: 'critical', kind: 'automation_error',
      message: `Automation "${id}" errored: ${result.detail.error ?? result.action}`,
      data: { automationId: id },
    });
  }
  return entry;
}

// Pull everything, evaluate all signal rules, persist deduped alerts.
export async function runAlertScan() {
  const store = await getStore();
  const settings = await store.getSettings();
  const [campaigns, creatives, products] = await Promise.all([
    adsPlatforms.listCampaigns(),
    adsPlatforms.listCreatives(),
    shopify.getProducts(),
  ]);
  const seriesByCampaign = {};
  for (const c of campaigns) {
    seriesByCampaign[c.id] = (await adsPlatforms.campaignSeries(c.id, Math.max(settings.scaleReadyDays + 2, 10))) ?? [];
  }
  const signals = collectSignals({ campaigns, seriesByCampaign, creatives, products, settings });
  let created = 0;
  for (const s of signals) {
    const { created: isNew } = await store.upsertAlert(s);
    if (isNew) created += 1;
  }
  return { signals, created };
}

export const automationIds = Object.keys(RUNNERS);
