import { useState } from 'react';
import { useApi } from '../api.js';
import { PageHeader } from '../components/Layout.jsx';
import { Card, StatTile, Spinner, ErrorNote, Th, Td } from '../components/ui.jsx';
import { DailyProfitBars } from '../charts/Charts.jsx';
import { money, pct } from '../format.js';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

export function Finance() {
  const [days, setDays] = useState(30);
  const { data, error, loading } = useApi(`/finance/pnl?days=${days}`, { intervalMs: 300_000 });

  if (loading) return <Spinner label="Computing P&L…" />;
  if (error) return <ErrorNote error={error} />;

  const { rows, totals, dailyFixedCost, breakEven } = data;
  const recentRows = rows.slice(-14);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Financial tracker"
        subtitle="Real profit: revenue − product cost − shipping − ad spend − payment fees − app costs. No vanity metrics."
        action={
          <div className="flex gap-1 bg-surface border border-edge rounded-lg p-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`text-xs px-3 py-1.5 rounded-md ${days === r.days ? 'bg-raised text-ink font-medium' : 'text-muted hover:text-ink2'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label={`Revenue (${days}d)`} value={money(totals.revenue)} />
        <StatTile label="Ad spend" value={money(totals.adSpend)} />
        <StatTile
          label="Net profit"
          value={money(totals.profit)}
          tone={totals.profit >= 0 ? 'text-good' : 'text-critical'}
        />
        <StatTile label="Profit per order" value={money(totals.profitPerOrder)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="Daily net profit" subtitle="Blue = profitable day · red = loss day" className="lg:col-span-2">
          <DailyProfitBars rows={rows} />
        </Card>
        <Card title="Break-even tracker" subtitle="What it takes to cover the fixed stack">
          <dl className="text-sm space-y-3">
            <div className="flex justify-between">
              <dt className="text-muted">Fixed costs / day</dt>
              <dd className="text-ink tabular">{money(dailyFixedCost)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Contribution / order</dt>
              <dd className="text-ink tabular">{breakEven ? money(breakEven.perOrderContribution) : '—'}</dd>
            </div>
            <div className="flex justify-between border-t border-edge pt-3">
              <dt className="text-muted">Orders needed / day</dt>
              <dd className="text-ink font-semibold tabular">{breakEven?.ordersNeeded ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Blended margin</dt>
              <dd className={`tabular ${totals.margin >= 0 ? 'text-good' : 'text-critical'}`}>{pct(totals.margin)}</dd>
            </div>
          </dl>
          <p className="text-[11px] text-muted mt-4 leading-relaxed">
            Contribution = revenue minus product, shipping, ads, and payment fees, per order —
            before the fixed app stack. Fixed costs are editable in Settings.
          </p>
        </Card>
      </div>

      <Card title="P&L detail" subtitle="Last 14 days, newest first">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-edge">
                <Th>Date</Th><Th className="text-right">Revenue</Th><Th className="text-right">COGS</Th>
                <Th className="text-right">Shipping</Th><Th className="text-right">Ad spend</Th>
                <Th className="text-right">Fees</Th><Th className="text-right">Apps/day</Th>
                <Th className="text-right">Net profit</Th><Th className="text-right">Margin</Th>
              </tr>
            </thead>
            <tbody>
              {[...recentRows].reverse().map((r) => (
                <tr key={r.date} className="border-b border-edge/60">
                  <Td className="tabular text-ink">{r.date}</Td>
                  <Td className="text-right tabular">{money(r.revenue)}</Td>
                  <Td className="text-right tabular">{money(r.cogs)}</Td>
                  <Td className="text-right tabular">{money(r.shipping)}</Td>
                  <Td className="text-right tabular">{money(r.adSpend)}</Td>
                  <Td className="text-right tabular">{money(r.fees)}</Td>
                  <Td className="text-right tabular">{money(r.fixedCosts)}</Td>
                  <Td className={`text-right tabular font-medium ${r.profit >= 0 ? 'text-good' : 'text-critical'}`}>{money(r.profit)}</Td>
                  <Td className="text-right tabular">{pct(r.margin)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
