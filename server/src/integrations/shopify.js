import { config } from '../config.js';
import * as mock from '../mock/seed.js';

const API_VERSION = '2024-07';

async function shopifyGet(path, params = {}) {
  const url = new URL(`https://${config.shopify.domain}/admin/api/${API_VERSION}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { 'X-Shopify-Access-Token': config.shopify.token, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Shopify ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

export const shopify = {
  get mode() { return config.shopify.mode; },

  // Daily aggregates for the last `days` days (oldest → newest).
  async getStoreSeries(days = 30) {
    if (this.mode === 'mock') return mock.storeSeries(days);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { orders } = await shopifyGet('orders.json', {
      status: 'any', created_at_min: since, limit: 250,
      fields: 'id,created_at,total_price,current_total_price,financial_status',
    });
    const byDay = new Map();
    for (const o of orders) {
      const day = o.created_at.slice(0, 10);
      const row = byDay.get(day) ?? { date: day, revenue: 0, orders: 0, adSpend: 0, cogs: 0, shipping: 0, sessions: 0, addToCarts: 0, checkouts: 0 };
      row.revenue += Number(o.current_total_price ?? o.total_price);
      row.orders += 1;
      byDay.set(day, row);
    }
    // Sessions/funnel come from GA4 or ShopifyQL when connected; COGS and ad
    // spend are joined in by the finance service from CJ + ad adapters.
    return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => ({ ...r, aov: r.orders ? r.revenue / r.orders : 0, conversionRate: 0 }));
  },

  async getRecentOrders(limit = 12) {
    if (this.mode === 'mock') return mock.recentOrders(limit);
    const { orders } = await shopifyGet('orders.json', {
      status: 'any', limit,
      fields: 'id,name,created_at,total_price,fulfillment_status,customer,line_items,fulfillments',
    });
    return orders.map((o) => ({
      id: o.name,
      customer: o.customer ? `${o.customer.first_name ?? ''} ${o.customer.last_name ?? ''}`.trim() : '—',
      product: o.line_items?.[0]?.title ?? '—',
      total: Number(o.total_price),
      status: o.fulfillment_status === 'fulfilled' ? 'shipped' : (o.fulfillment_status ?? 'pending'),
      placedAt: o.created_at,
      autoFulfilled: (o.fulfillments?.length ?? 0) > 0,
      tracking: o.fulfillments?.[0]?.tracking_number ?? null,
    }));
  },

  async getFulfillmentPipeline() {
    if (this.mode === 'mock') return mock.fulfillmentPipeline();
    const [pending, shipped] = await Promise.all([
      shopifyGet('orders/count.json', { fulfillment_status: 'unfulfilled', status: 'open' }),
      shopifyGet('orders/count.json', { fulfillment_status: 'shipped', status: 'any' }),
    ]);
    return { pending: pending.count, processing: 0, shipped: shipped.count, delivered: 0 };
  },

  async getProducts() {
    if (this.mode === 'mock') return mock.PRODUCTS;
    const { products } = await shopifyGet('products.json', { limit: 50 });
    return products.map((p) => ({
      id: String(p.id), name: p.title, sku: p.variants?.[0]?.sku ?? '',
      price: Number(p.variants?.[0]?.price ?? 0),
      stock: p.variants?.reduce((s, v) => s + (v.inventory_quantity ?? 0), 0) ?? 0,
      // Landed cost + shipping live in CJ / settings when live.
      cost: Number(p.variants?.[0]?.compare_at_price ? 0 : 0) || null,
      shipCost: null, supplier: p.vendor, reviewScore: null, shippingDays: null,
    }));
  },
};
