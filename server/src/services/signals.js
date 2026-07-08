import { round2 } from '../mock/random.js';
import { breakEvenRoas } from './finance.js';

// Scaling-signal and guardrail rules. Pure functions over campaign series so
// they are testable and identical between mock and live data.

// ROAS ≥ minRoasHealthy for `scaleReadyDays` consecutive full days → ready
// to scale, next step = +maxDailyBudgetIncreasePercent (never more per day).
export function scaleReadySignal(campaign, series, settings) {
  const full = series.filter((d) => d.date !== new Date().toISOString().slice(0, 10));
  const window = full.slice(-settings.scaleReadyDays);
  if (window.length < settings.scaleReadyDays) return null;
  if (!window.every((d) => d.roas >= settings.minRoasHealthy)) return null;
  const step = 1 + settings.maxDailyBudgetIncreasePercent / 100;
  return {
    kind: 'scale_ready',
    severity: 'good',
    key: `scale:${campaign.id}`,
    campaignId: campaign.id,
    message: `${campaign.name} held ROAS ≥ ${settings.minRoasHealthy}:1 for ${settings.scaleReadyDays} straight days. Raise daily budget $${campaign.dailyBudget} → $${round2(campaign.dailyBudget * step)} (+${settings.maxDailyBudgetIncreasePercent}%). Never raise more than ${settings.maxDailyBudgetIncreasePercent}% in a day.`,
    data: {
      currentBudget: campaign.dailyBudget,
      suggestedBudget: round2(campaign.dailyBudget * step),
      windowRoas: round2(window.reduce((s, d) => s + d.roas, 0) / window.length),
    },
  };
}

// ROAS below the product's break-even for `breakEvenBreachDays` consecutive
// full days → money is burning; flag for kill/review.
export function breakEvenBreachSignal(campaign, series, product, settings) {
  if (!product) return null;
  const be = breakEvenRoas(product, settings);
  const full = series.filter((d) => d.date !== new Date().toISOString().slice(0, 10) && d.spend > 0);
  const window = full.slice(-settings.breakEvenBreachDays);
  if (window.length < settings.breakEvenBreachDays) return null;
  if (!window.every((d) => d.roas < be)) return null;
  const burned = round2(window.reduce((s, d) => s + (d.spend - d.revenue / be), 0));
  return {
    kind: 'break_even_breach',
    severity: 'critical',
    key: `breach:${campaign.id}`,
    campaignId: campaign.id,
    message: `${campaign.name} ran below break-even ROAS (${be}:1) for ${settings.breakEvenBreachDays} consecutive days. Kill or rework — roughly $${burned} burned in the window.`,
    data: { breakEvenRoas: be, lastRoas: window.at(-1).roas, daysBelow: window.length },
  };
}

// TikTok creative CTR ≥ winner threshold → duplicate the structure.
export function winnerCreativeSignal(creative, campaign, settings) {
  if (!campaign || campaign.platform !== 'tiktok') return null;
  if (creative.ctr < settings.winnerCtrPercent) return null;
  return {
    kind: 'winner_creative',
    severity: 'good',
    key: `creative:${creative.id}`,
    campaignId: campaign.id,
    message: `Creative "${creative.hook}" is at ${creative.ctr}% CTR (threshold ${settings.winnerCtrPercent}%). Duplicate the structure with 2–3 new hooks before it fatigues.`,
    data: { creativeId: creative.id, ctr: creative.ctr, purchases: creative.purchases },
  };
}

// Product review score under the floor → supplier quality investigation.
export function reviewScoreSignal(product, settings) {
  if (product.reviewScore == null || product.reviewScore >= settings.reviewScoreFloor) return null;
  return {
    kind: 'review_quality',
    severity: 'serious',
    key: `reviews:${product.id}`,
    productId: product.id,
    message: `${product.name} review score fell to ${product.reviewScore} (floor ${settings.reviewScoreFloor}). Order a QC inspection from CJ and check recent review text before scaling further.`,
    data: { reviewScore: product.reviewScore },
  };
}

export function collectSignals({ campaigns, seriesByCampaign, creatives, products, settings }) {
  const signals = [];
  for (const campaign of campaigns) {
    const series = seriesByCampaign[campaign.id] ?? [];
    const product = products.find((p) => p.id === campaign.productId);
    const scale = scaleReadySignal(campaign, series, settings);
    if (scale) signals.push(scale);
    const breach = breakEvenBreachSignal(campaign, series, product, settings);
    if (breach) signals.push(breach);
  }
  for (const creative of creatives) {
    const campaign = campaigns.find((c) => c.id === creative.campaignId);
    const win = winnerCreativeSignal(creative, campaign, settings);
    if (win) signals.push(win);
  }
  for (const product of products) {
    const rev = reviewScoreSignal(product, settings);
    if (rev) signals.push(rev);
  }
  const order = { critical: 0, serious: 1, warning: 2, good: 3 };
  return signals.sort((a, b) => order[a.severity] - order[b.severity]);
}
