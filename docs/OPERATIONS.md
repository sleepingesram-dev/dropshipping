# Operations — the 2–3 hours per week

Everything else is automated and logged. If you're doing something weekly that
isn't on this page, it should probably be an automation.

## The weekly routine

**Monday (~45 min) — money review**
- Finance page: last 7 days net profit, margin, break-even orders/day.
- Ads page: any campaign whose 7-day cost-per-purchase is above its
  break-even contribution for the full week gets killed today. No appeals —
  never scale a loser hoping it turns around.
- Signals page: act on every open alert, then "Mark handled".

**Wednesday (~45 min) — creative review**
- Ads page → Creative performance: duplicate every "winner — duplicate" flag
  with 2–3 new hooks (same structure, new first 3 seconds).
- Kill creatives under 1% CTR with $50+ spend — the hook isn't stopping the
  scroll.
- Brief new UGC if the pipeline is thin (Billo/JoinBrands, $50–150/video).

**Friday (~45 min) — store & research review**
- Dashboard: add-to-cart rate under 3%? Fix the product page before touching
  ad budgets (hero video, price anchor, reviews, FAQ).
- Research page: re-scan, save anything with a **winner** verdict to
  candidates with a note on the angle you'd run.
- Automations log: skim for anything unusual; investigate every `error`.

## The metrics that matter (and the ones that don't)

| Metric | Floor / target | Where |
|---|---|---|
| Cost per purchase | below product contribution | Ads |
| ROAS | 2:1 survives, 3:1 healthy | Ads |
| Break-even ROAS | computed per product | Ads (dashed line) |
| Add-to-cart rate | ≥ 3% | Dashboard funnel |
| Ad CTR | ≥ 1% (kill), ≥ 2% (winner) | Ads → creatives |
| AOV | raise with bundles/upsells | Dashboard |
| Net profit | positive by week 3–4 | Finance |

Impressions, likes, follower counts: not tracked. They don't pay for anything.

## Ad ramp strategy (enforced by the alert engine)

- **Week 1–2:** TikTok only. $20–30/day, one campaign, broad targeting,
  3–5 creatives with different hooks. Do not touch interest targeting — let
  the algorithm find the buyer.
- **Week 3:** kill losers (below break-even 2 days = automatic alert),
  raise winners +20% every 2 days — never more than +20% in a single day.
- **Week 4:** rebuild the winning creative structure with new hooks; open
  Meta with an Advantage+ Shopping campaign using the proven angle, $20/day.
- **Month 2:** add Google Performance Max for brand + product search terms
  once branded searches appear in Shopify's search reports.
- **Always:** 3–5 organic TikTok posts/day recycling ad hooks — paid winners
  get free organic amplification.

## When a product dies

Every product fatigues. The pattern: CTR decays first, then CPP climbs, then
ROAS crosses break-even — the system alerts at each stage. Response order:
1. New hooks on the winning creative structure (cheapest fix).
2. New angle (different problem, different audience) on the same product.
3. Retire the product, promote the next candidate from Research. This is why
   the candidate shortlist stays warm with notes.

## Rules that never bend

- Budget increases: max +20%/day on any ad set.
- Two consecutive days below break-even ROAS = spend stops.
- No product goes live that fails a hard gate — the score is irrelevant if a
  gate fails.
- Every dollar of tooling must save more than a dollar of time or make more
  than a dollar of revenue — audit the app stack monthly in Settings.
- One supplier is a single point of failure: once a product does 10+
  orders/day, ask CJ for a second source quote and a US-warehouse option.
