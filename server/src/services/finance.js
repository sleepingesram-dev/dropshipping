import { round2 } from '../mock/random.js';

// Real profit, not vanity metrics:
// profit = revenue − COGS − shipping − ad spend − payment fees − app costs.

export function dailyFixedCost(settings) {
  const monthly = Object.values(settings.monthlyFixedCosts ?? {}).reduce((s, v) => s + Number(v || 0), 0);
  return round2(monthly / 30);
}

export function paymentFees(revenue, orders, settings) {
  return round2(revenue * (settings.shopifyFeePercent / 100) + orders * settings.shopifyFeeFixed);
}

// One store-day → full P&L row.
export function pnlDay(day, settings) {
  const fees = paymentFees(day.revenue, day.orders, settings);
  const fixed = dailyFixedCost(settings);
  const profit = round2(day.revenue - day.cogs - day.shipping - day.adSpend - fees - fixed);
  return {
    date: day.date,
    revenue: round2(day.revenue),
    cogs: round2(day.cogs),
    shipping: round2(day.shipping),
    adSpend: round2(day.adSpend),
    fees,
    fixedCosts: fixed,
    profit,
    margin: day.revenue > 0 ? round2((profit / day.revenue) * 100) : 0,
  };
}

export function pnlSummary(days, settings) {
  const rows = days.map((d) => pnlDay(d, settings));
  const sum = (key) => round2(rows.reduce((s, r) => s + r[key], 0));
  const revenue = sum('revenue');
  const profit = sum('profit');
  const orders = days.reduce((s, d) => s + d.orders, 0);
  return {
    rows,
    totals: {
      revenue, cogs: sum('cogs'), shipping: sum('shipping'), adSpend: sum('adSpend'),
      fees: sum('fees'), fixedCosts: sum('fixedCosts'), profit,
      orders,
      margin: revenue > 0 ? round2((profit / revenue) * 100) : 0,
      profitPerOrder: orders > 0 ? round2(profit / orders) : 0,
    },
  };
}

// Break-even ROAS for a product: at what ROAS does a purely ad-driven sale
// stop losing money? spend_be = price − landed − per-order fees, so
// breakEvenRoas = price / contribution.
export function breakEvenRoas(product, settings) {
  const landed = product.cost + product.shipCost;
  const fees = product.price * (settings.shopifyFeePercent / 100) + settings.shopifyFeeFixed;
  const contribution = product.price - landed - fees;
  if (contribution <= 0) return Infinity;
  return round2(product.price / contribution);
}

// How many orders/day cover the fixed stack at current unit economics.
export function breakEvenOrdersPerDay(days, settings) {
  const totalOrders = days.reduce((s, d) => s + d.orders, 0);
  if (totalOrders === 0) return null;
  const contribution = days.reduce((s, d) => {
    const fees = paymentFees(d.revenue, d.orders, settings);
    return s + (d.revenue - d.cogs - d.shipping - d.adSpend - fees);
  }, 0);
  const perOrder = contribution / totalOrders;
  if (perOrder <= 0) return { perOrderContribution: round2(perOrder), ordersNeeded: null };
  return {
    perOrderContribution: round2(perOrder),
    ordersNeeded: Math.ceil(dailyFixedCost(settings) / perOrder),
  };
}
