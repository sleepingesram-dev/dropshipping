import test from 'node:test';
import assert from 'node:assert/strict';
import { pnlDay, pnlSummary, breakEvenRoas, breakEvenOrdersPerDay, dailyFixedCost, paymentFees } from '../src/services/finance.js';
import { DEFAULT_SETTINGS } from '../src/store/defaults.js';

const settings = { ...DEFAULT_SETTINGS, monthlyFixedCosts: { shopify: 30, tools: 60 } }; // $3/day fixed

test('paymentFees applies percent + per-order fixed fee', () => {
  assert.equal(paymentFees(1000, 10, settings), 1000 * 0.029 + 10 * 0.3);
});

test('pnlDay computes real profit net of every cost', () => {
  const day = { date: '2026-07-01', revenue: 500, orders: 10, cogs: 120, shipping: 40, adSpend: 150 };
  const row = pnlDay(day, settings);
  const fees = 500 * 0.029 + 10 * 0.3; // 17.5
  assert.equal(row.fees, 17.5);
  assert.equal(row.fixedCosts, 3);
  assert.equal(row.profit, Math.round((500 - 120 - 40 - 150 - fees - 3) * 100) / 100);
  assert.ok(row.margin > 0);
});

test('pnlSummary totals match the sum of rows', () => {
  const days = [
    { date: 'd1', revenue: 300, orders: 6, cogs: 70, shipping: 20, adSpend: 90 },
    { date: 'd2', revenue: 0, orders: 0, cogs: 0, shipping: 0, adSpend: 45 },
  ];
  const { rows, totals } = pnlSummary(days, settings);
  assert.equal(totals.revenue, 300);
  assert.equal(totals.orders, 6);
  assert.equal(totals.profit, Math.round((rows[0].profit + rows[1].profit) * 100) / 100);
  assert.equal(rows[1].margin, 0); // no revenue day → margin 0, not NaN
});

test('breakEvenRoas is price / contribution', () => {
  const product = { price: 40, cost: 8, shipCost: 4 };
  const fees = 40 * 0.029 + 0.3; // 1.46
  const expected = Math.round((40 / (40 - 12 - fees)) * 100) / 100;
  assert.equal(breakEvenRoas(product, settings), expected);
});

test('breakEvenRoas is Infinity when the product cannot profit', () => {
  assert.equal(breakEvenRoas({ price: 10, cost: 8, shipCost: 4 }, settings), Infinity);
});

test('breakEvenOrdersPerDay covers fixed costs with per-order contribution', () => {
  const days = [{ date: 'd1', revenue: 400, orders: 10, cogs: 100, shipping: 30, adSpend: 100 }];
  const be = breakEvenOrdersPerDay(days, settings);
  assert.ok(be.perOrderContribution > 0);
  assert.equal(be.ordersNeeded, Math.ceil(dailyFixedCost(settings) / be.perOrderContribution));
});

test('breakEvenOrdersPerDay handles zero orders', () => {
  assert.equal(breakEvenOrdersPerDay([{ date: 'd', revenue: 0, orders: 0, cogs: 0, shipping: 0, adSpend: 50 }], settings), null);
});
