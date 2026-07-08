# DropshipOS — automation command center

One dashboard that runs a dropshipping business on two to three hours of human
attention per week: product research scoring, store health, ad performance vs
break-even, order/inventory/email automation monitoring, real-profit P&L, and
scaling signals — with every automated action logged.

## How it works

```
client/  React 18 + Vite + Tailwind v4 + Recharts (dark, data-forward UI)
server/  Node 20+ + Express
         ├── integrations/   Shopify · TikTok Ads · Meta Ads · CJDropshipping · AutoDS · Klaviyo
         ├── services/       finance (real P&L) · scoring (winning-product framework) · signals (scale/kill rules)
         ├── jobs/           scheduler → automation runs → append-only log
         └── store/          Postgres (DATABASE_URL) or zero-config JSON file store
```

**Demo mode first.** Every integration runs `mock` until its API keys are added
to `server/.env` — the whole app works end to end on day one with realistic,
deterministic simulated data (a 6-SKU pet/home store with a scaling winner, a
dying campaign, and live-feeling orders). Add a key, restart, and that
integration flips to `live` with no code changes. The Settings page shows the
current mode of every integration.

## Quickstart

```bash
npm install
npm run dev        # server :4000 + client :5173
```

Open http://localhost:5173. Production build: `npm run build` then `npm start`
— the server serves the built client and the API from one port.

Tests (finance math, product-scoring gates, scaling-signal rules):

```bash
npm test
```

## Going live

1. Copy `server/.env.example` → `server/.env`.
2. Add keys integration by integration (each is independent):

| Integration | What flips to live | Keys |
|---|---|---|
| Shopify | revenue, orders, funnel, fulfillment | `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_TOKEN` |
| TikTok Ads | campaign spend/ROAS/CTR | `TIKTOK_ACCESS_TOKEN`, `TIKTOK_ADVERTISER_ID` |
| Meta Ads | campaign spend/ROAS | `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` |
| CJDropshipping | stock levels, supplier price moves | `CJ_API_EMAIL`, `CJ_API_KEY` |
| AutoDS | order-automation events (webhook-fed) | `AUTODS_WEBHOOK_SECRET` |
| Klaviyo | email flow status | `KLAVIYO_API_KEY` |
| Postgres | durable storage (optional) | `DATABASE_URL` (then `npm run migrate`) |

3. Follow **[docs/SETUP.md](docs/SETUP.md)** — the exact one-time human steps
   (accounts, pixels, domain, payment) that software cannot do for you.
4. Run the business with **[docs/OPERATIONS.md](docs/OPERATIONS.md)** — the
   weekly routine, the metrics that matter, and the ad ramp strategy the alert
   engine enforces.

## Deploy

`render.yaml` is a ready Render blueprint (one web service + optional
Postgres). Railway works identically: build `npm install && npm run build`,
start `npm start`, set env vars from the table above.

## The rules encoded in the system

- **Scale:** ROAS ≥ 3:1 for 7 straight days → raise budget, max +20%/day.
- **Kill:** ROAS below the product's break-even for 2 consecutive days → stop.
- **Duplicate:** TikTok creative at ≥ 2% CTR → clone the structure, new hooks.
- **Investigate:** review score < 4.2 → supplier QC before more spend.
- **Product gates:** ≥3× markup, ≤14-day US shipping, no licensed IP, not
  fragile/oversized, no FDA-territory claims, <30 competing stores — any
  failure rejects the product regardless of its score.

All thresholds are editable in Settings and feed the scanner directly.
