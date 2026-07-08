import { rngForDay, mulberry32, round2, isoDay } from './random.js';

// ── Catalog ───────────────────────────────────────────────────────────────
// A believable 6-SKU store in the pet + home-organization lanes.
export const PRODUCTS = [
  { id: 'p1', name: 'PawTrim Pro — quiet pet nail grinder', sku: 'PT-100', cost: 6.8, shipCost: 3.1, price: 34.95, supplier: 'CJDropshipping (US warehouse)', stock: 412, reviewScore: 4.6, shippingDays: 6 },
  { id: 'p2', name: 'CloudLift orthopedic pet bed', sku: 'CL-200', cost: 14.2, shipCost: 6.4, price: 59.95, supplier: 'CJDropshipping (US warehouse)', stock: 187, reviewScore: 4.5, shippingDays: 8 },
  { id: 'p3', name: 'SnapShelf floating corner shelves (2-pack)', sku: 'SS-300', cost: 5.9, shipCost: 3.6, price: 29.95, supplier: 'CJDropshipping (CN)', stock: 640, reviewScore: 4.3, shippingDays: 11 },
  { id: 'p4', name: 'GlowVeil sunset projection lamp', sku: 'GV-400', cost: 7.4, shipCost: 2.9, price: 32.95, supplier: 'AliExpress via AutoDS', stock: 92, reviewScore: 4.1, shippingDays: 12 },
  { id: 'p5', name: 'ChopMate 14-in-1 vegetable chopper', sku: 'CM-500', cost: 8.1, shipCost: 4.2, price: 39.95, supplier: 'CJDropshipping (US warehouse)', stock: 305, reviewScore: 4.7, shippingDays: 7 },
  { id: 'p6', name: 'TangleFree magnetic cable organizer set', sku: 'TF-600', cost: 2.6, shipCost: 1.8, price: 19.95, supplier: 'CJDropshipping (CN)', stock: 0, reviewScore: 4.4, shippingDays: 13 },
];

// ── Campaigns ─────────────────────────────────────────────────────────────
// Each has a narrative arc so the dashboard has real stories to surface:
// tt-1 is a scaler, tt-2 is dying (below break-even), mt-1 is steady,
// gg-1 is a small Performance Max harvester.
export const CAMPAIGNS = [
  { id: 'tt-1', platform: 'tiktok', name: 'PawTrim — hook test v3 (broad US)', productId: 'p1', dailyBudget: 60, status: 'active', arc: 'winner' },
  { id: 'tt-2', platform: 'tiktok', name: 'GlowVeil — UGC unboxing (broad US)', productId: 'p4', dailyBudget: 30, status: 'active', arc: 'loser' },
  { id: 'tt-3', platform: 'tiktok', name: 'ChopMate — problem/solution (broad US)', productId: 'p5', dailyBudget: 40, status: 'active', arc: 'riser' },
  { id: 'mt-1', platform: 'meta', name: 'PawTrim — Advantage+ Shopping', productId: 'p1', dailyBudget: 45, status: 'active', arc: 'steady' },
  { id: 'mt-2', platform: 'meta', name: 'CloudLift — testimonial carousel', productId: 'p2', dailyBudget: 25, status: 'paused', arc: 'paused' },
  { id: 'gg-1', platform: 'google', name: 'Brand + product — Performance Max', productId: null, dailyBudget: 15, status: 'active', arc: 'steady' },
];

export const CREATIVES = [
  { id: 'cr-1', campaignId: 'tt-1', hook: '"Your dog hates nail clippers. So did mine."', format: 'UGC problem/solution', ctr: 2.6, spend: 918, purchases: 74, thumbstop: 41 },
  { id: 'cr-2', campaignId: 'tt-1', hook: 'ASMR grinding close-up, no narration', format: 'Demo loop', ctr: 1.9, spend: 641, purchases: 41, thumbstop: 35 },
  { id: 'cr-3', campaignId: 'tt-1', hook: 'Groomer reacts: "stop paying $20 a trim"', format: 'Authority UGC', ctr: 1.4, spend: 388, purchases: 19, thumbstop: 28 },
  { id: 'cr-4', campaignId: 'tt-2', hook: 'Unboxing + room transformation', format: 'UGC unboxing', ctr: 0.8, spend: 512, purchases: 11, thumbstop: 22 },
  { id: 'cr-5', campaignId: 'tt-2', hook: 'POV: your room at 8pm', format: 'Aesthetic demo', ctr: 1.1, spend: 344, purchases: 9, thumbstop: 26 },
  { id: 'cr-6', campaignId: 'tt-3', hook: '"I almost returned it. Then I tried the dicer."', format: 'UGC redemption', ctr: 2.2, spend: 505, purchases: 38, thumbstop: 38 },
  { id: 'cr-7', campaignId: 'mt-1', hook: 'Before/after nails + vet quote overlay', format: 'Video testimonial', ctr: 1.6, spend: 730, purchases: 47, thumbstop: 30 },
];

// Per-arc ROAS trajectory: f(daysAgo) → target ROAS, noise added on top.
function arcRoas(arc, daysAgo) {
  switch (arc) {
    case 'winner': return daysAgo > 21 ? 1.8 : 1.8 + ((21 - daysAgo) / 21) * 1.9; // climbs 1.8 → 3.7
    case 'riser': return daysAgo > 10 ? 1.4 : 1.4 + ((10 - daysAgo) / 10) * 1.6;  // climbs 1.4 → 3.0
    case 'loser': return daysAgo > 14 ? 2.1 : 2.1 - ((14 - daysAgo) / 14) * 1.1;  // decays 2.1 → 1.0
    case 'steady': return 2.4;
    default: return 0;
  }
}

// Daily metrics for one campaign, `daysAgo` in the past (0 = today, partial).
export function campaignDay(campaign, daysAgo) {
  if (campaign.status === 'paused') {
    return { date: isoDay(daysAgo), spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0, roas: 0, cpp: 0, ctr: 0 };
  }
  const rand = rngForDay(daysAgo, campaign.id.charCodeAt(0) * 131 + campaign.id.charCodeAt(3));
  const dayFraction = daysAgo === 0 ? Math.min(1, (new Date().getHours() + 1) / 24) : 1;
  const spend = round2(campaign.dailyBudget * (0.88 + rand() * 0.14) * dayFraction);
  const roasTarget = arcRoas(campaign.arc, daysAgo) * (0.82 + rand() * 0.36);
  const revenue = round2(spend * roasTarget);
  const cpm = campaign.platform === 'tiktok' ? 6.5 : campaign.platform === 'meta' ? 11 : 9;
  const impressions = Math.round((spend / cpm) * 1000);
  const baseCtr = campaign.platform === 'tiktok' ? 0.016 : 0.012;
  const clicks = Math.round(impressions * baseCtr * (0.8 + rand() * 0.5));
  const product = PRODUCTS.find((p) => p.id === campaign.productId) ?? PRODUCTS[0];
  const purchases = Math.max(revenue > 0 ? 1 : 0, Math.round(revenue / product.price));
  return {
    date: isoDay(daysAgo),
    spend,
    impressions,
    clicks,
    purchases,
    revenue,
    roas: spend > 0 ? round2(revenue / spend) : 0,
    cpp: purchases > 0 ? round2(spend / purchases) : 0,
    ctr: impressions > 0 ? round2((clicks / impressions) * 100) : 0,
  };
}

export function campaignSeries(campaign, days = 30) {
  const out = [];
  for (let d = days - 1; d >= 0; d--) out.push(campaignDay(campaign, d));
  return out;
}

// ── Store-level day (aggregated across campaigns + organic) ──────────────
export function storeDay(daysAgo) {
  const rand = rngForDay(daysAgo, 7919);
  const adDays = CAMPAIGNS.map((c) => campaignDay(c, daysAgo));
  const adRevenue = adDays.reduce((s, d) => s + d.revenue, 0);
  const adSpend = adDays.reduce((s, d) => s + d.spend, 0);
  const adOrders = adDays.reduce((s, d) => s + d.purchases, 0);
  const organicRevenue = round2(adRevenue * (0.12 + rand() * 0.1)); // TikTok organic spillover
  const revenue = round2(adRevenue + organicRevenue);
  const orders = adOrders + Math.round(organicRevenue / 34);
  const sessions = Math.round(adDays.reduce((s, d) => s + d.clicks, 0) * (1.25 + rand() * 0.2));
  const avgUnitCost = 8.9; // blended landed cost share per order, mock-side
  // Funnel stages must be monotone: sessions ≥ ATC ≥ checkout ≥ purchase.
  const checkouts = Math.max(orders + 1, Math.round(sessions * (0.028 + rand() * 0.01)));
  const addToCarts = Math.max(checkouts + 2, Math.round(sessions * (0.055 + rand() * 0.02)));
  return {
    date: isoDay(daysAgo),
    revenue,
    orders,
    adSpend: round2(adSpend),
    cogs: round2(orders * avgUnitCost),
    shipping: round2(orders * 3.7),
    sessions,
    addToCarts,
    checkouts,
    aov: orders > 0 ? round2(revenue / orders) : 0,
    conversionRate: sessions > 0 ? round2((orders / sessions) * 100) : 0,
  };
}

export function storeSeries(days = 30) {
  const out = [];
  for (let d = days - 1; d >= 0; d--) out.push(storeDay(d));
  return out;
}

// ── Fulfillment pipeline & recent orders ─────────────────────────────────
const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered'];
const FIRST = ['Maya', 'Jordan', 'Priya', 'Caleb', 'Sofia', 'Liam', 'Amara', 'Noah', 'Isla', 'Diego', 'Harper', 'Ezra'];
const LAST = ['Reyes', 'Chen', 'Okafor', 'Novak', 'Bennett', 'Kaur', 'Moreau', 'Silva', 'Hart', 'Yamada'];

export function recentOrders(limit = 12) {
  const rand = mulberry32(rngForDay(0, 42)() * 1e9);
  const orders = [];
  for (let i = 0; i < limit; i++) {
    const product = PRODUCTS[Math.floor(rand() * PRODUCTS.length)];
    const hoursAgo = Math.floor(rand() * 72);
    const status = ORDER_STATUSES[Math.min(3, Math.floor(hoursAgo / 20))];
    orders.push({
      id: `#10${482 - i}`,
      customer: `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]}`,
      product: product.name,
      total: round2(product.price * (rand() < 0.18 ? 2 : 1)),
      status,
      placedAt: new Date(Date.now() - hoursAgo * 3.6e6).toISOString(),
      autoFulfilled: status !== 'pending',
      tracking: status === 'shipped' || status === 'delivered' ? `CJ${Math.floor(rand() * 9e9 + 1e9)}US` : null,
    });
  }
  return orders.sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

export function fulfillmentPipeline() {
  const rand = rngForDay(0, 271);
  return {
    pending: 2 + Math.floor(rand() * 3),
    processing: 5 + Math.floor(rand() * 5),
    shipped: 14 + Math.floor(rand() * 8),
    delivered: 36 + Math.floor(rand() * 10),
  };
}

export function supportQueue() {
  const rand = rngForDay(0, 613);
  const open = 1 + Math.floor(rand() * 4);
  return {
    open,
    resolvedByBot: 17 + Math.floor(rand() * 6),
    botDeflectionRate: 0.81,
    avgFirstResponseMinutes: 4,
    satisfaction: 4.7,
    tickets: [
      { id: 't1', subject: 'Where is my order? #10467', channel: 'chat', status: 'bot-resolved', ageMinutes: 22 },
      { id: 't2', subject: 'Return request — CloudLift bed', channel: 'email', status: 'open', ageMinutes: 140 },
      { id: 't3', subject: 'Does PawTrim work for large breeds?', channel: 'chat', status: 'bot-resolved', ageMinutes: 310 },
    ].slice(0, Math.max(1, open)),
  };
}

// ── Supplier / inventory events (CJ + AutoDS side) ────────────────────────
export function inventoryAlerts() {
  return [
    { productId: 'p6', sku: 'TF-600', type: 'out_of_stock', message: 'TangleFree organizer out of stock at supplier — auto-hidden from storefront by AutoDS.', at: isoDay(0) },
    { productId: 'p4', sku: 'GV-400', type: 'low_stock', message: 'GlowVeil lamp at 92 units (supplier). Reorder threshold is 100.', at: isoDay(0) },
    { productId: 'p3', sku: 'SS-300', type: 'price_change', message: 'Supplier cost rose $5.90 → $6.35 (+7.6%). Store price auto-adjusted $29.95 → $31.95 to hold margin.', at: isoDay(1) },
  ];
}

// ── Product research: trending feed with raw signals ─────────────────────
// Shapes match what the scoring engine expects; signals mimic what the
// TikTok Creative Center / Google Trends / AliExpress adapters return live.
export const TRENDING_PRODUCTS = [
  {
    id: 'tr-1', name: 'Cordless electric spin scrubber', category: 'Home & cleaning',
    supplierCost: 11.2, shipCost: 4.8, suggestedPrice: 49.95, shippingDays: 9,
    signals: { tiktokViews7d: 18_400_000, viewVelocity: 'rising', metaAdsRunning14d: 9, googleTrend90d: 'up', aliOrders30d: 8400, amazonFirstPage: false, competingStores: 12 },
    criteria: { problemSolving: 9, wowFactor: 8, retailScarcity: 6, repeatPurchase: 5, fragile: false, oversized: false, licensed: false, seasonal: false, saturated: false },
  },
  {
    id: 'tr-2', name: 'Anti-anxiety calming dog bed (donut)', category: 'Pet',
    supplierCost: 13.6, shipCost: 6.1, suggestedPrice: 54.95, shippingDays: 7,
    signals: { tiktokViews7d: 9_100_000, viewVelocity: 'steady', metaAdsRunning14d: 21, googleTrend90d: 'up', aliOrders30d: 15200, amazonFirstPage: true, competingStores: 34 },
    criteria: { problemSolving: 8, wowFactor: 6, retailScarcity: 4, repeatPurchase: 4, fragile: false, oversized: false, licensed: false, seasonal: false, saturated: true },
  },
  {
    id: 'tr-3', name: 'Collapsible car trunk organizer with cooler pocket', category: 'Car accessories',
    supplierCost: 9.8, shipCost: 5.2, suggestedPrice: 44.95, shippingDays: 8,
    signals: { tiktokViews7d: 4_600_000, viewVelocity: 'rising', metaAdsRunning14d: 6, googleTrend90d: 'up', aliOrders30d: 5100, amazonFirstPage: false, competingStores: 8 },
    criteria: { problemSolving: 8, wowFactor: 7, retailScarcity: 7, repeatPurchase: 3, fragile: false, oversized: false, licensed: false, seasonal: false, saturated: false },
  },
  {
    id: 'tr-4', name: 'LED face-sculpting red light mask', category: 'Beauty devices',
    supplierCost: 22.4, shipCost: 5.9, suggestedPrice: 89.95, shippingDays: 10,
    signals: { tiktokViews7d: 26_800_000, viewVelocity: 'rising', metaAdsRunning14d: 17, googleTrend90d: 'up', aliOrders30d: 6900, amazonFirstPage: true, competingStores: 22 },
    criteria: { problemSolving: 7, wowFactor: 9, retailScarcity: 5, repeatPurchase: 6, fragile: true, oversized: false, licensed: false, seasonal: false, saturated: false, healthClaims: true },
  },
  {
    id: 'tr-5', name: 'Magnetic levitating plant pot', category: 'Home aesthetic',
    supplierCost: 16.9, shipCost: 6.8, suggestedPrice: 59.95, shippingDays: 15,
    signals: { tiktokViews7d: 3_100_000, viewVelocity: 'spiky', metaAdsRunning14d: 3, googleTrend90d: 'flat', aliOrders30d: 900, amazonFirstPage: false, competingStores: 5 },
    criteria: { problemSolving: 3, wowFactor: 10, retailScarcity: 8, repeatPurchase: 2, fragile: true, oversized: false, licensed: false, seasonal: false, saturated: false },
  },
  {
    id: 'tr-6', name: 'Baby bottle warmer for the car (USB-C)', category: 'Baby & parenting',
    supplierCost: 8.7, shipCost: 3.9, suggestedPrice: 36.95, shippingDays: 9,
    signals: { tiktokViews7d: 5_800_000, viewVelocity: 'rising', metaAdsRunning14d: 11, googleTrend90d: 'up', aliOrders30d: 4300, amazonFirstPage: false, competingStores: 9 },
    criteria: { problemSolving: 9, wowFactor: 6, retailScarcity: 7, repeatPurchase: 4, fragile: false, oversized: false, licensed: false, seasonal: false, saturated: false },
  },
  {
    id: 'tr-7', name: 'Personalized pet portrait night light', category: 'Personalized gifts',
    supplierCost: 12.3, shipCost: 4.4, suggestedPrice: 49.95, shippingDays: 12,
    signals: { tiktokViews7d: 2_900_000, viewVelocity: 'rising', metaAdsRunning14d: 5, googleTrend90d: 'up', aliOrders30d: 2600, amazonFirstPage: false, competingStores: 6 },
    criteria: { problemSolving: 5, wowFactor: 8, retailScarcity: 9, repeatPurchase: 6, fragile: true, oversized: false, licensed: false, seasonal: false, saturated: false },
  },
  {
    id: 'tr-8', name: 'Ice-globe facial roller set (branded lookalike)', category: 'Beauty',
    supplierCost: 4.1, shipCost: 2.6, suggestedPrice: 24.95, shippingDays: 18,
    signals: { tiktokViews7d: 7_400_000, viewVelocity: 'steady', metaAdsRunning14d: 28, googleTrend90d: 'flat', aliOrders30d: 11800, amazonFirstPage: true, competingStores: 41 },
    criteria: { problemSolving: 5, wowFactor: 6, retailScarcity: 3, repeatPurchase: 3, fragile: true, oversized: false, licensed: false, seasonal: false, saturated: true },
  },
];

export function klaviyoFlows() {
  return [
    { id: 'fl-1', name: 'Abandoned cart (3-email)', status: 'live', sent30d: 412, openRate: 0.47, revenue30d: 1830.4, recoveryRate: 0.17 },
    { id: 'fl-2', name: 'Order confirmation + tracking', status: 'live', sent30d: 689, openRate: 0.71, revenue30d: 0, recoveryRate: null },
    { id: 'fl-3', name: 'Delivery + review request', status: 'live', sent30d: 597, openRate: 0.38, revenue30d: 240.1, recoveryRate: null },
    { id: 'fl-4', name: 'Post-purchase upsell (day 7 / 14)', status: 'live', sent30d: 511, openRate: 0.33, revenue30d: 962.7, recoveryRate: null },
    { id: 'fl-5', name: 'Win-back (60-day lapsed)', status: 'live', sent30d: 138, openRate: 0.24, revenue30d: 310.2, recoveryRate: null },
  ];
}
