import test from 'node:test';
import assert from 'node:assert/strict';
import { scaleReadySignal, breakEvenBreachSignal, winnerCreativeSignal, reviewScoreSignal, collectSignals } from '../src/services/signals.js';
import { DEFAULT_SETTINGS } from '../src/store/defaults.js';

const settings = { ...DEFAULT_SETTINGS };
const campaign = { id: 'c1', name: 'Test campaign', platform: 'tiktok', dailyBudget: 50, productId: 'p1', status: 'active' };
const product = { id: 'p1', name: 'Test product', price: 40, cost: 8, shipCost: 4, reviewScore: 4.6 };

// Series builder: `roasByDay` oldest → newest, all "full" past days.
function series(roasByDay) {
  return roasByDay.map((roas, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, '0')}`,
    spend: 50, revenue: 50 * roas, roas, purchases: 3, clicks: 80, impressions: 5000, ctr: 1.6, cpp: 16,
  }));
}

test('7 straight days at 3+ ROAS → scale-ready with +20% budget suggestion', () => {
  const s = scaleReadySignal(campaign, series([3.2, 3.5, 3.1, 3.4, 3.0, 3.6, 3.3]), settings);
  assert.ok(s);
  assert.equal(s.kind, 'scale_ready');
  assert.equal(s.data.suggestedBudget, 60); // 50 * 1.2 — never more than +20%/day
});

test('one bad day inside the window blocks scale-ready', () => {
  const s = scaleReadySignal(campaign, series([3.2, 3.5, 2.4, 3.4, 3.0, 3.6, 3.3]), settings);
  assert.equal(s, null);
});

test('2 consecutive days below break-even → critical breach', () => {
  const s = breakEvenBreachSignal(campaign, series([2.5, 1.1, 1.0]), product, settings);
  assert.ok(s);
  assert.equal(s.severity, 'critical');
  assert.ok(s.data.breakEvenRoas > 1);
});

test('recovery day resets the breach window', () => {
  const s = breakEvenBreachSignal(campaign, series([1.0, 2.6]), product, settings);
  assert.equal(s, null);
});

test('TikTok creative at 2%+ CTR is a winner; Meta creative is not flagged by this rule', () => {
  const creative = { id: 'cr1', campaignId: 'c1', hook: 'hook', ctr: 2.4, purchases: 30 };
  assert.ok(winnerCreativeSignal(creative, campaign, settings));
  assert.equal(winnerCreativeSignal(creative, { ...campaign, platform: 'meta' }, settings), null);
});

test('review score under 4.2 flags supplier quality', () => {
  assert.equal(reviewScoreSignal(product, settings), null);
  const flagged = reviewScoreSignal({ ...product, reviewScore: 4.0 }, settings);
  assert.ok(flagged);
  assert.equal(flagged.kind, 'review_quality');
});

test('collectSignals sorts critical first', () => {
  const signals = collectSignals({
    campaigns: [campaign],
    seriesByCampaign: { c1: series([1.0, 1.1]) },
    creatives: [{ id: 'cr1', campaignId: 'c1', hook: 'h', ctr: 2.5, purchases: 10 }],
    products: [product],
    settings,
  });
  assert.ok(signals.length >= 2);
  assert.equal(signals[0].severity, 'critical');
});
