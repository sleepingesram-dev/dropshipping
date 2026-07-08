import { Router } from 'express';
import { integrationStatus, config } from '../config.js';
import { getStore } from '../store/index.js';
import { shopify } from '../integrations/shopify.js';
import { adsPlatforms } from '../integrations/ads.js';
import { cjdropshipping, autods, klaviyo } from '../integrations/suppliers.js';
import { supportDesk } from '../integrations/support.js';
import { TRENDING_PRODUCTS } from '../mock/seed.js';
import { scoreAll, scoreProduct } from '../services/scoring.js';
import { pnlSummary, breakEvenRoas, breakEvenOrdersPerDay, dailyFixedCost } from '../services/finance.js';
import { runAutomation, runAlertScan } from '../services/automations.js';

export const api = Router();

const wrap = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(`[api] ${req.method} ${req.path}:`, err.message);
    res.status(500).json({ error: err.message });
  });
};

// ── health / integration status ───────────────────────────────────────────
api.get('/health', wrap(async (_req, res) => {
  res.json({ ok: true, integrations: integrationStatus(), now: new Date().toISOString() });
}));

// ── store health dashboard ────────────────────────────────────────────────
api.get('/store/overview', wrap(async (_req, res) => {
  const series = await shopify.getStoreSeries(30);
  const today = series.at(-1) ?? {};
  const yesterday = series.at(-2) ?? {};
  const [pipeline, orders, inventory, support, autodsStatus] = await Promise.all([
    shopify.getFulfillmentPipeline(),
    shopify.getRecentOrders(10),
    cjdropshipping.getInventoryAlerts(),
    supportDesk.getQueue(),
    autods.getStatus(),
  ]);
  res.json({ today, yesterday, pipeline, orders, inventory, support, autods: autodsStatus });
}));

api.get('/store/series', wrap(async (req, res) => {
  const days = Math.min(90, Number(req.query.days) || 30);
  const store = await getStore();
  const settings = await store.getSettings();
  const series = await shopify.getStoreSeries(days);
  res.json({ series: pnlSummary(series, settings).rows.map((r, i) => ({ ...series[i], profit: r.profit })) });
}));

api.get('/store/products', wrap(async (_req, res) => {
  const store = await getStore();
  const settings = await store.getSettings();
  const products = await shopify.getProducts();
  res.json({
    products: products.map((p) => ({
      ...p,
      breakEvenRoas: p.cost != null && p.shipCost != null ? breakEvenRoas(p, settings) : null,
    })),
  });
}));

// ── product research ──────────────────────────────────────────────────────
api.get('/research/trending', wrap(async (_req, res) => {
  const store = await getStore();
  const settings = await store.getSettings();
  res.json({ products: scoreAll(TRENDING_PRODUCTS, { market: settings.targetMarket }) });
}));

api.get('/research/candidates', wrap(async (_req, res) => {
  const store = await getStore();
  res.json({ candidates: await store.listCandidates() });
}));

api.post('/research/candidates', wrap(async (req, res) => {
  const store = await getStore();
  const settings = await store.getSettings();
  const body = req.body ?? {};
  if (!body.name) return res.status(400).json({ error: 'name is required' });
  const analysis = body.supplierCost != null ? scoreProduct(body, { market: settings.targetMarket }) : body.analysis ?? null;
  const row = await store.addCandidate({ ...body, analysis });
  res.status(201).json({ candidate: row });
}));

api.patch('/research/candidates/:id', wrap(async (req, res) => {
  const store = await getStore();
  const row = await store.updateCandidate(req.params.id, req.body ?? {});
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json({ candidate: row });
}));

api.delete('/research/candidates/:id', wrap(async (req, res) => {
  const store = await getStore();
  const ok = await store.removeCandidate(req.params.id);
  res.status(ok ? 204 : 404).end();
}));

// ── ad performance ────────────────────────────────────────────────────────
api.get('/ads/campaigns', wrap(async (_req, res) => {
  const store = await getStore();
  const settings = await store.getSettings();
  const [campaigns, products] = await Promise.all([adsPlatforms.listCampaigns(), shopify.getProducts()]);
  const out = [];
  for (const c of campaigns) {
    const series = (await adsPlatforms.campaignSeries(c.id, 14)) ?? [];
    const last7 = series.slice(-8, -1); // full days only
    const sum = (k) => last7.reduce((s, d) => s + d[k], 0);
    const spend = sum('spend');
    const revenue = sum('revenue');
    const purchases = sum('purchases');
    const clicks = sum('clicks');
    const impressions = sum('impressions');
    const product = products.find((p) => p.id === c.productId);
    out.push({
      ...c,
      last7: {
        spend: Math.round(spend * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
        cpp: purchases > 0 ? Math.round((spend / purchases) * 100) / 100 : 0,
        ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
        purchases,
      },
      breakEvenRoas: product && product.cost != null ? breakEvenRoas(product, settings) : null,
      series,
    });
  }
  res.json({ campaigns: out });
}));

api.get('/ads/creatives', wrap(async (_req, res) => {
  const store = await getStore();
  const settings = await store.getSettings();
  const [creatives, campaigns] = await Promise.all([adsPlatforms.listCreatives(), adsPlatforms.listCampaigns()]);
  res.json({
    creatives: creatives.map((cr) => {
      const campaign = campaigns.find((c) => c.id === cr.campaignId);
      return {
        ...cr,
        campaignName: campaign?.name ?? cr.campaignId,
        platform: campaign?.platform ?? '—',
        cpp: cr.purchases > 0 ? Math.round((cr.spend / cr.purchases) * 100) / 100 : null,
        isWinner: campaign?.platform === 'tiktok' && cr.ctr >= settings.winnerCtrPercent,
      };
    }),
  });
}));

api.get('/ads/pacing', wrap(async (_req, res) => {
  res.json({ pacing: await adsPlatforms.spendPacing() });
}));

// ── automations control center ────────────────────────────────────────────
api.get('/automations', wrap(async (_req, res) => {
  const store = await getStore();
  res.json({ automations: await store.listAutomations() });
}));

api.patch('/automations/:id', wrap(async (req, res) => {
  const store = await getStore();
  const { enabled } = req.body ?? {};
  const row = await store.setAutomation(req.params.id, { enabled: Boolean(enabled) });
  if (!row) return res.status(404).json({ error: 'not found' });
  await store.appendLog({
    automationId: req.params.id, trigger: 'manual',
    action: `Automation ${enabled ? 'enabled' : 'paused'} by operator`, outcome: 'ok', detail: {},
  });
  res.json({ automation: row });
}));

api.post('/automations/:id/run', wrap(async (req, res) => {
  const entry = await runAutomation(req.params.id, { trigger: 'manual' });
  if (!entry) return res.status(404).json({ error: 'not found' });
  res.json({ run: entry });
}));

api.get('/automations/log', wrap(async (req, res) => {
  const store = await getStore();
  res.json({ log: await store.listLog(Math.min(200, Number(req.query.limit) || 100)) });
}));

// ── alerts + scaling signals ──────────────────────────────────────────────
api.get('/alerts', wrap(async (req, res) => {
  const store = await getStore();
  res.json({ alerts: await store.listAlerts({ includeResolved: req.query.all === '1' }) });
}));

api.post('/alerts/:id/resolve', wrap(async (req, res) => {
  const store = await getStore();
  const row = await store.resolveAlert(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
}));

api.get('/signals', wrap(async (_req, res) => {
  const { signals } = await runAlertScan();
  res.json({ signals });
}));

// ── finance ───────────────────────────────────────────────────────────────
api.get('/finance/pnl', wrap(async (req, res) => {
  const days = Math.min(90, Number(req.query.days) || 30);
  const store = await getStore();
  const settings = await store.getSettings();
  const series = await shopify.getStoreSeries(days);
  const summary = pnlSummary(series, settings);
  res.json({
    ...summary,
    dailyFixedCost: dailyFixedCost(settings),
    breakEven: breakEvenOrdersPerDay(series, settings),
  });
}));

// ── email / flows ─────────────────────────────────────────────────────────
api.get('/email/flows', wrap(async (_req, res) => {
  res.json({ flows: await klaviyo.getFlows() });
}));

// ── settings ──────────────────────────────────────────────────────────────
api.get('/settings', wrap(async (_req, res) => {
  const store = await getStore();
  res.json({ settings: await store.getSettings(), integrations: integrationStatus() });
}));

api.put('/settings', wrap(async (req, res) => {
  const store = await getStore();
  res.json({ settings: await store.updateSettings(req.body ?? {}) });
}));

// ── webhooks ──────────────────────────────────────────────────────────────
api.post('/webhooks/autods', wrap(async (req, res) => {
  if (config.autods.webhookSecret && req.get('x-autods-secret') !== config.autods.webhookSecret) {
    return res.status(401).json({ error: 'bad secret' });
  }
  autods.recordWebhook(req.body ?? {});
  const store = await getStore();
  await store.appendLog({
    automationId: 'order-fulfillment', trigger: 'webhook',
    action: `AutoDS event: ${req.body?.type ?? 'unknown'}`,
    outcome: req.body?.type === 'order_failed' ? 'error' : 'ok',
    detail: req.body ?? {},
  });
  res.json({ ok: true });
}));
