import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreProduct, markupMultiple, hardGates } from '../src/services/scoring.js';

const strongProduct = {
  name: 'Test winner', supplierCost: 6, shipCost: 3, suggestedPrice: 36, shippingDays: 7,
  signals: { tiktokViews7d: 9e6, viewVelocity: 'rising', metaAdsRunning14d: 8, googleTrend90d: 'up', aliOrders30d: 9000, amazonFirstPage: false, competingStores: 6 },
  criteria: { problemSolving: 9, wowFactor: 9, retailScarcity: 8, repeatPurchase: 6, fragile: false, oversized: false, licensed: false, seasonal: false, saturated: false },
};

test('markupMultiple = price / landed cost', () => {
  assert.equal(markupMultiple(strongProduct), 4);
});

test('a strong product scores as a winner', () => {
  const a = scoreProduct(strongProduct);
  assert.ok(a.score >= 70, `score ${a.score} should be >= 70`);
  assert.equal(a.gatesPassed, true);
  assert.equal(a.verdict, 'winner');
});

test('licensed IP fails a hard gate regardless of score', () => {
  const p = { ...strongProduct, criteria: { ...strongProduct.criteria, licensed: true } };
  const a = scoreProduct(p);
  assert.equal(a.gatesPassed, false);
  assert.equal(a.verdict, 'rejected');
});

test('markup below 3x fails the markup gate', () => {
  const p = { ...strongProduct, suggestedPrice: 20 }; // 20 / 9 ≈ 2.2x
  const { gates, passed } = hardGates(p);
  assert.equal(passed, false);
  assert.equal(gates.find((g) => g.id === 'markup').pass, false);
});

test('shipping gate follows target market', () => {
  const p = { ...strongProduct, shippingDays: 18 };
  assert.equal(hardGates(p, { market: 'US' }).passed, false);
  assert.equal(hardGates(p, { market: 'EU' }).passed, true); // ≤21 for intl
});

test('saturation (30+ competing stores) is rejected', () => {
  const p = { ...strongProduct, signals: { ...strongProduct.signals, competingStores: 34 } };
  assert.equal(hardGates(p).passed, false);
});

test('a gimmick with no problem-solving lands below winner even if gates pass', () => {
  const p = {
    ...strongProduct,
    signals: { ...strongProduct.signals, viewVelocity: 'spiky', googleTrend90d: 'flat', aliOrders30d: 500 },
    criteria: { ...strongProduct.criteria, problemSolving: 2, wowFactor: 10, repeatPurchase: 1 },
  };
  const a = scoreProduct(p);
  assert.equal(a.gatesPassed, true);
  assert.notEqual(a.verdict, 'winner');
});
