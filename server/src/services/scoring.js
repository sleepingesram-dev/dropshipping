import { round2 } from '../mock/random.js';

// The winning-product framework as code. Every trending product is checked
// against hard gates (any failure = rejected regardless of score) and a
// weighted 0–100 score across the criteria that predict paid-traffic success.

const WEIGHTS = {
  problemSolving: 15, // solves a problem / strong desire
  wowFactor: 15, // demonstrable on video in <30s
  markup: 15, // perceived value vs landed cost
  retailScarcity: 10, // hard to find at Walmart/Target
  amazonGap: 10, // not dominated on Amazon page one
  shipping: 10, // days to primary market
  demand: 10, // order velocity + trend trajectory
  competition: 10, // room left in the market
  repeatPurchase: 5, // LTV via reorders/upsells
};

export function markupMultiple(p) {
  const landed = p.supplierCost + p.shipCost;
  return landed > 0 ? round2(p.suggestedPrice / landed) : 0;
}

export function hardGates(p, { market = 'US' } = {}) {
  const c = p.criteria ?? {};
  const maxShip = market === 'US' ? 14 : 21;
  const gates = [
    { id: 'licensed', pass: !c.licensed, label: 'No licensed characters / brand IP' },
    { id: 'fragile', pass: !c.fragile, label: 'Not fragile / no shipping-damage risk' },
    { id: 'oversized', pass: !c.oversized, label: 'Not oversized / no special handling' },
    { id: 'health-claims', pass: !c.healthClaims, label: 'No FDA-territory health claims' },
    { id: 'saturation', pass: !c.saturated && (p.signals?.competingStores ?? 0) < 30, label: 'Not saturated (<30 competing stores)' },
    { id: 'shipping', pass: p.shippingDays <= maxShip, label: `Ships in ≤${maxShip} days to ${market}` },
    { id: 'markup', pass: markupMultiple(p) >= 3, label: 'Markup ≥ 3× landed cost' },
    { id: 'seasonal', pass: !c.seasonal, label: 'Not seasonal (or timing deliberate)' },
  ];
  return { gates, passed: gates.every((g) => g.pass) };
}

function scale(value, max) {
  return Math.max(0, Math.min(1, value / max));
}

export function scoreProduct(p, opts = {}) {
  const c = p.criteria ?? {};
  const s = p.signals ?? {};
  const markup = markupMultiple(p);

  const parts = {
    problemSolving: scale(c.problemSolving ?? 0, 10),
    wowFactor: scale(c.wowFactor ?? 0, 10),
    markup: scale(markup, 5), // 5× landed = full marks
    retailScarcity: scale(c.retailScarcity ?? 0, 10),
    amazonGap: s.amazonFirstPage ? 0.3 : 1, // page-one presence needs an angle
    shipping: p.shippingDays <= 8 ? 1 : p.shippingDays <= 14 ? 0.7 : p.shippingDays <= 21 ? 0.35 : 0,
    demand: (s.googleTrend90d === 'up' ? 0.4 : s.googleTrend90d === 'flat' ? 0.2 : 0)
      + (s.viewVelocity === 'rising' ? 0.35 : s.viewVelocity === 'steady' ? 0.2 : 0.05)
      + scale(s.aliOrders30d ?? 0, 10_000) * 0.25,
    competition: 1 - scale(s.competingStores ?? 0, 40),
    repeatPurchase: scale(c.repeatPurchase ?? 0, 10),
  };

  const score = Object.entries(WEIGHTS)
    .reduce((sum, [k, w]) => sum + parts[k] * w, 0);

  const { gates, passed } = hardGates(p, opts);
  return {
    score: Math.round(score),
    markupMultiple: markup,
    landedCost: round2(p.supplierCost + p.shipCost),
    gates,
    gatesPassed: passed,
    verdict: passed && score >= 70 ? 'winner' : passed ? 'watchlist' : 'rejected',
    breakdown: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v * WEIGHTS[k])])),
  };
}

export function scoreAll(products, opts = {}) {
  return products
    .map((p) => ({ ...p, analysis: scoreProduct(p, opts) }))
    .sort((a, b) => b.analysis.score - a.analysis.score);
}
