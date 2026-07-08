# One-time setup — the steps only a human can do

Everything below happens once. After it, the system runs itself and DropshipOS
watches it. Do the steps in order; each unlocks the next. Budget roughly
6–10 hours total, spread over a week while accounts verify.

## Before you start — decisions that shape the setup

Write these down first; steps below reference them.

1. **Budget split.** Minimum workable: ~$150/mo tools (Shopify, AutoDS,
   Klaviyo, support bot, research tool — the defaults in Settings) + $600–900
   first-month ad budget ($20–30/day). Under ~$750 total, wait and save —
   underfunded ad testing produces noise, not data.
2. **Target market.** Default is US (best CPM-to-AOV ratio). Set it in
   DropshipOS → Settings; it changes the shipping gate (14 vs 21 days).
3. **Time.** Setup week needs ~1–2 h/day. After launch: 2–3 h/week.
4. **Entity.** An LLC is not legally required to start in the US; a sole
   proprietorship works day one. Form the LLC (your state's Secretary of State
   site, typically $50–200) once revenue is consistent — Shopify Payments and
   suppliers accept either. Non-US founders: check Stripe Atlas or your local
   equivalent.

## 1. Business bank account

Open a free business checking account (Mercury, Novo, or Relay for online-only;
any local bank works). Every platform below gets THIS account, never a
personal one — clean books make the P&L in DropshipOS match reality.

## 2. Shopify store

1. shopify.com → Start free trial → choose the **Basic** plan after trial.
2. Settings → Store details: business name, address, the bank account.
3. Settings → Payments: activate **Shopify Payments** (and PayPal as a
   secondary). Enable Shop Pay, Apple Pay, Google Pay.
4. Settings → Checkout: one-page checkout, abandoned checkout emails ON.
5. Settings → Policies: generate refund, privacy, and terms templates, then
   read and edit them — they are legally binding.
6. Online store → Themes: install **Dawn** (free). Don't customize yet;
   product pages come after the first product is chosen.

## 3. Domain

1. Buy the `.com` (or `.co`) at Cloudflare Registrar or Namecheap — $10–15/yr.
   Short, brandable, no hyphens, no product names you might outgrow.
2. Shopify → Settings → Domains → Connect existing domain → follow the CNAME
   instructions. Verify the padlock (SSL) shows before running any ads.

## 4. CJDropshipping

1. cjdropshipping.com → register with your business email.
2. My CJ → Authorization → **API** → create key. Put `CJ_API_EMAIL` +
   `CJ_API_KEY` into `server/.env` — inventory and price monitoring in
   DropshipOS flips live.
3. App Store → install "CJDropshipping" into your Shopify store and authorize.

## 5. AutoDS

1. autods.com → start with the **Import 200** plan. Note: price & stock
   monitoring is **not included** on this plan — treat AutoDS as import +
   order automation only, and let CJDropshipping + DropshipOS handle price
   and inventory monitoring (that's the `price-sync` and `inventory-sync`
   automations). If you'd rather have AutoDS do the monitoring too, upgrade
   to a plan that lists it before relying on it.
2. Add store → Shopify → authorize.
3. Settings → Auto Ordering: ON. Load $100 into the AutoDS balance — this is
   what places supplier orders with zero clicks from you.
4. If (and only if) your plan includes Price & Stock Monitoring: turn it ON,
   price-change auto-adjust ON, out-of-stock action = "set quantity 0"
   (hides the product). Otherwise skip — DropshipOS covers this via CJ.

## 6. TikTok (organic + ads)

1. Create a TikTok **Business** account with the store's email.
2. ads.tiktok.com → create the Ads Manager account, add the bank card,
   set timezone to your target market's (cannot be changed later).
3. Shopify App Store → install **TikTok** app → connect → this installs the
   TikTok Pixel automatically. Verify: TikTok Events Manager shows a
   **`Purchase`** test event after a test checkout, with value/currency
   parameters attached — that's the event sales campaigns optimize on. (The
   UI sometimes shows friendlier wording; in code/API land the standard
   purchase event is `Purchase`.)
4. In Ads Manager → Tools → API access: generate a token for DropshipOS
   (`TIKTOK_ACCESS_TOKEN`, `TIKTOK_ADVERTISER_ID` in `server/.env`).

## 7. Meta (Facebook + Instagram)

1. business.facebook.com → create the Business portfolio, add a Facebook Page
   and Instagram account for the brand.
2. Shopify App Store → install **Facebook & Instagram** app → connect —
   installs the Meta Pixel + Conversions API automatically. Verify events in
   Meta Events Manager.
3. Business settings → System users → create one, assign the ad account with
   `ads_read`, generate a token → `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID`
   into `server/.env`.

## 8. Klaviyo

1. klaviyo.com → sign up → connect Shopify (one-click integration).
2. Turn ON these pre-built flows, in this order: Abandoned cart (3 emails),
   Order confirmation, Shipping confirmation, Post-delivery review request,
   Post-purchase upsell, Win-back. Edit the templates to the brand's voice.
3. Settings → API keys → create a private key → `KLAVIYO_API_KEY` in
   `server/.env`.

## 9. Reviews + support

1. Shopify App Store → **Judge.me** (free plan): review request email at
   7 days post-delivery. **Review compliance (FTC rule in effect since
   Oct 21, 2024, with civil penalties):** only import reviews that are real
   reviews of the *exact same product*, and represent honestly where they
   came from — no borrowed reviews from lookalike listings, ever. If you
   offer a discount for photo reviews, the incentive must not be conditioned
   on the review being positive, and incentivized reviews must be disclosed.
2. Shopify App Store → **Tidio**: enable the AI responder for order status,
   shipping times, and returns. Connect your support email. Everything it
   can't answer lands in the queue DropshipOS shows.

## 10. DropshipOS itself

1. Deploy: push this repo to GitHub → Render → New → Blueprint → point at
   `render.yaml` (or run locally with `npm run dev`).
2. Fill `server/.env` with every key collected above; restart.
3. Settings page: confirm every integration shows **live**, set your real
   monthly app costs and target market.
4. Watch the Automations page for one full day — every action the stack takes
   is in the log. Anything red arrives as an alert.

## 11. First product + first creatives (the only creative work)

1. Pick the top **winner**-verdict product from the Research page that you can
   also personally explain in one sentence.
2. Order one unit to your address.
3. Film with a phone, near a window, no studio: (a) an unboxing, (b) the
   problem-then-solution demo, (c) a 10-second loop of the product doing its
   thing. Edit in CapCut with auto-captions and a trending sound.
4. That's 3 ad creatives. Launch per the ramp plan in
   [OPERATIONS.md](OPERATIONS.md).
