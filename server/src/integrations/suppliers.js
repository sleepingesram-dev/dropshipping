import { config } from '../config.js';
import * as mock from '../mock/seed.js';

// ── CJDropshipping API v2 ─────────────────────────────────────────────────
// Auth: POST /authentication/getAccessToken with email + apiKey, then pass
// CJ-Access-Token on data calls. Tokens last 15 days; we cache in-process.
let cjToken = null;
let cjTokenExpiry = 0;

async function cjFetch(path, body) {
  if (!cjToken || Date.now() > cjTokenExpiry) {
    const res = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: config.cj.email, password: config.cj.apiKey }),
    });
    const data = await res.json();
    if (!data.result) throw new Error(`CJ auth: ${data.message}`);
    cjToken = data.data.accessToken;
    cjTokenExpiry = Date.now() + 14 * 86_400_000;
  }
  const res = await fetch(`https://developers.cjdropshipping.com/api2.0/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'CJ-Access-Token': cjToken },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.result) throw new Error(`CJ ${path}: ${data.message}`);
  return data.data;
}

export const cjdropshipping = {
  get mode() { return config.cj.mode; },

  async getInventoryAlerts() {
    if (this.mode === 'mock') return mock.inventoryAlerts();
    // Live: compare variant stock against thresholds per connected product.
    const list = await cjFetch('/product/stock/queryByVid', { vids: [] });
    return (list ?? []).filter((v) => v.storageNum < 100).map((v) => ({
      productId: v.vid, sku: v.variantSku,
      type: v.storageNum === 0 ? 'out_of_stock' : 'low_stock',
      message: `${v.variantSku} at ${v.storageNum} units at supplier.`,
      at: new Date().toISOString().slice(0, 10),
    }));
  },
};

// ── AutoDS ────────────────────────────────────────────────────────────────
// No public REST API — order/fulfillment status arrives via webhooks posted
// to /api/webhooks/autods. Mock mode simulates a healthy automation loop.
const autodsEvents = [];

export const autods = {
  get mode() { return config.autods.mode; },

  recordWebhook(event) {
    autodsEvents.unshift({ ...event, receivedAt: new Date().toISOString() });
    autodsEvents.splice(200);
  },

  async getStatus() {
    if (this.mode === 'mock') {
      return {
        balance: 184.6, autoOrderingEnabled: true,
        ordersProcessed24h: 11, failedOrders24h: 0,
        priceMonitorActive: true, stockMonitorActive: true,
        recentEvents: [
          { type: 'order_placed', detail: 'Order #10480 → CJ, $9.90 charged to balance', at: new Date(Date.now() - 40 * 60e3).toISOString() },
          { type: 'tracking_uploaded', detail: 'Order #10474 tracking CJ8412093711US → Shopify', at: new Date(Date.now() - 3 * 3.6e6).toISOString() },
          { type: 'price_adjusted', detail: 'SS-300 store price $29.95 → $31.95 (supplier +7.6%)', at: new Date(Date.now() - 26 * 3.6e6).toISOString() },
        ],
      };
    }
    return {
      balance: null, autoOrderingEnabled: true,
      ordersProcessed24h: autodsEvents.filter((e) => e.type === 'order_placed' && Date.parse(e.receivedAt) > Date.now() - 86_400_000).length,
      failedOrders24h: autodsEvents.filter((e) => e.type === 'order_failed' && Date.parse(e.receivedAt) > Date.now() - 86_400_000).length,
      priceMonitorActive: true, stockMonitorActive: true,
      recentEvents: autodsEvents.slice(0, 10),
    };
  },
};

// ── Klaviyo ───────────────────────────────────────────────────────────────
export const klaviyo = {
  get mode() { return config.klaviyo.mode; },

  async getFlows() {
    if (this.mode === 'mock') return mock.klaviyoFlows();
    const res = await fetch('https://a.klaviyo.com/api/flows/', {
      headers: {
        Authorization: `Klaviyo-API-Key ${config.klaviyo.apiKey}`,
        revision: '2024-07-15', accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Klaviyo flows → ${res.status}`);
    const body = await res.json();
    return body.data.map((f) => ({
      id: f.id, name: f.attributes.name,
      status: f.attributes.status === 'live' ? 'live' : f.attributes.status,
      sent30d: null, openRate: null, revenue30d: null, recoveryRate: null,
    }));
  },
};
