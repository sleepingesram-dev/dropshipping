import 'dotenv/config';

const env = (key, fallback = undefined) => {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
};

// Each integration runs 'live' when its credentials are present, otherwise
// 'mock' — the whole app works end to end on day one and flips to real data
// per-integration as keys are added to .env.
export const config = {
  port: Number(env('PORT', 4000)),
  databaseUrl: env('DATABASE_URL'),
  shopify: {
    domain: env('SHOPIFY_STORE_DOMAIN'),
    token: env('SHOPIFY_ADMIN_TOKEN'),
    get mode() { return this.domain && this.token ? 'live' : 'mock'; },
  },
  tiktok: {
    token: env('TIKTOK_ACCESS_TOKEN'),
    advertiserId: env('TIKTOK_ADVERTISER_ID'),
    get mode() { return this.token && this.advertiserId ? 'live' : 'mock'; },
  },
  meta: {
    token: env('META_ACCESS_TOKEN'),
    adAccountId: env('META_AD_ACCOUNT_ID'),
    get mode() { return this.token && this.adAccountId ? 'live' : 'mock'; },
  },
  cj: {
    email: env('CJ_API_EMAIL'),
    apiKey: env('CJ_API_KEY'),
    get mode() { return this.email && this.apiKey ? 'live' : 'mock'; },
  },
  autods: {
    webhookSecret: env('AUTODS_WEBHOOK_SECRET'),
    // AutoDS exposes no public REST API — 'live' here means webhook-fed.
    get mode() { return this.webhookSecret ? 'live' : 'mock'; },
  },
  klaviyo: {
    apiKey: env('KLAVIYO_API_KEY'),
    get mode() { return this.apiKey ? 'live' : 'mock'; },
  },
};

export function integrationStatus() {
  return {
    shopify: config.shopify.mode,
    tiktok: config.tiktok.mode,
    meta: config.meta.mode,
    cjdropshipping: config.cj.mode,
    autods: config.autods.mode,
    klaviyo: config.klaviyo.mode,
    database: config.databaseUrl ? 'postgres' : 'file',
  };
}
