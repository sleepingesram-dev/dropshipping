// Default operator settings + automation registry state. This is the shape
// persisted by both the file store and Postgres.
export const DEFAULT_SETTINGS = {
  targetMarket: 'US',
  currency: 'USD',
  // Fees used by the finance engine
  shopifyFeePercent: 2.9, // Shopify Payments online rate (Basic plan)
  shopifyFeeFixed: 0.3, // per transaction
  monthlyFixedCosts: {
    shopify: 39, // Basic plan
    autods: 26.9, // Import 200 plan (order automation; monitoring is CJ + DropshipOS side)
    klaviyo: 20, // starter tier once past free
    domain: 1.25, // ~$15/yr
    supportBot: 29, // Tidio starter
    researchTool: 49, // Minea starter
  },
  // Guardrails used by the alert + scaling engines
  minRoasHealthy: 3.0,
  scaleReadyDays: 7,
  breakEvenBreachDays: 2,
  winnerCtrPercent: 2.0,
  reviewScoreFloor: 4.2,
  maxDailyBudgetIncreasePercent: 20,
};

export const DEFAULT_AUTOMATIONS = [
  { id: 'order-fulfillment', name: 'Order fulfillment (AutoDS)', description: 'New Shopify orders are placed with the supplier automatically from the preloaded AutoDS balance.', enabled: true, intervalMinutes: 5 },
  { id: 'price-sync', name: 'Supplier price monitoring', description: 'If a supplier raises cost, the store price adjusts to protect the configured margin.', enabled: true, intervalMinutes: 30 },
  { id: 'inventory-sync', name: 'Inventory monitoring', description: 'Out-of-stock supplier items are hidden from the storefront automatically.', enabled: true, intervalMinutes: 15 },
  { id: 'tracking-sync', name: 'Tracking number sync', description: 'Supplier tracking numbers push to Shopify and trigger the Klaviyo shipping email.', enabled: true, intervalMinutes: 20 },
  { id: 'email-flows', name: 'Klaviyo email flows', description: 'Abandoned cart, confirmation, shipping, review request, upsell, and win-back sequences.', enabled: true, intervalMinutes: 60 },
  { id: 'review-requests', name: 'Review requests (Judge.me)', description: 'Review email 7 days after delivery; photo reviews get a disclosed discount incentive (never conditioned on a positive review — FTC).', enabled: true, intervalMinutes: 360 },
  { id: 'support-bot', name: 'Support chatbot (Tidio)', description: 'WISMO, returns, and shipping questions answered automatically; <20% escalate to a human.', enabled: true, intervalMinutes: 10 },
  { id: 'ad-sync', name: 'Ad performance sync', description: 'Pulls TikTok / Meta / Google spend and revenue for ROAS monitoring.', enabled: true, intervalMinutes: 15 },
  { id: 'alert-scan', name: 'Alert & scaling-signal scan', description: 'Flags break-even breaches, scale-ready campaigns, winning creatives, and review-score drops.', enabled: true, intervalMinutes: 60 },
];
