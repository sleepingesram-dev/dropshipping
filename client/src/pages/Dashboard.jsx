import { useApi } from '../api.js';
import { PageHeader } from '../components/Layout.jsx';
import { Card, StatTile, Pill, Spinner, ErrorNote, Th, Td } from '../components/ui.jsx';
import { RevenueProfitChart, FunnelBars } from '../charts/Charts.jsx';
import { money, int, pct, timeAgo } from '../format.js';

function delta(today, yesterday) {
  if (!yesterday) return null;
  return ((today - yesterday) / yesterday) * 100;
}

// Compare today's running totals against yesterday *at the same time of
// day* — a partial day vs a full day reads as a fake collapse.
function paceDelta(today, yesterday) {
  const now = new Date();
  const frac = Math.max(0.05, (now.getHours() * 60 + now.getMinutes()) / 1440);
  return delta(today, yesterday * frac);
}

const STATUS_TONE = { pending: 'amber', processing: 'blue', shipped: 'neutral', delivered: 'green' };

export function Dashboard() {
  const { data, error, loading } = useApi('/store/overview', { intervalMs: 60_000 });
  const { data: seriesData } = useApi('/store/series?days=30', { intervalMs: 300_000 });

  if (loading) return <Spinner label="Loading store health…" />;
  if (error) return <ErrorNote error={error} />;

  const { today, yesterday, pipeline, orders, inventory, support, autods } = data;
  const funnel = [
    { name: 'Sessions', value: today.sessions },
    { name: 'Add to cart', value: today.addToCarts },
    { name: 'Checkout', value: today.checkouts },
    { name: 'Purchase', value: today.orders },
  ];
  const atcRate = today.sessions ? (today.addToCarts / today.sessions) * 100 : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Store health"
        subtitle="Today so far, refreshed every minute. Profit line is net of product cost, shipping, ads, fees, and app costs."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Revenue today" value={money(today.revenue)} delta={paceDelta(today.revenue, yesterday?.revenue)} deltaLabel="vs same time yesterday" />
        <StatTile label="Orders today" value={int(today.orders)} delta={paceDelta(today.orders, yesterday?.orders)} deltaLabel="vs same time yesterday" />
        <StatTile label="Conversion rate" value={pct(today.conversionRate)} delta={delta(today.conversionRate, yesterday?.conversionRate)} deltaLabel="vs yesterday" />
        <StatTile label="Average order value" value={money(today.aov)} delta={delta(today.aov, yesterday?.aov)} deltaLabel="vs yesterday" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="Revenue vs net profit" subtitle="Last 30 days" className="lg:col-span-2">
          {seriesData ? <RevenueProfitChart series={seriesData.series} /> : <Spinner />}
        </Card>
        <Card
          title="Today's funnel"
          subtitle={`Add-to-cart ${pct(atcRate)}${atcRate < 3 ? ' — below the 3% floor: fix the product page before raising spend' : ''}`}
        >
          <FunnelBars stages={funnel} />
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="Fulfillment pipeline" subtitle="AutoDS places supplier orders automatically">
          <div className="grid grid-cols-4 gap-2 text-center">
            {Object.entries(pipeline).map(([stage, count]) => (
              <div key={stage} className="bg-raised rounded-lg py-3">
                <p className="text-lg font-semibold text-ink tabular">{count}</p>
                <p className="text-[11px] text-muted capitalize mt-0.5">{stage}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-ink2 space-y-1.5">
            <p className="flex justify-between"><span className="text-muted">AutoDS balance</span><span className="tabular">{autods.balance != null ? money(autods.balance) : '—'}</span></p>
            <p className="flex justify-between"><span className="text-muted">Auto-ordered (24h)</span><span className="tabular">{autods.ordersProcessed24h}</span></p>
            <p className="flex justify-between">
              <span className="text-muted">Failed orders (24h)</span>
              <span className={autods.failedOrders24h > 0 ? 'text-critical font-medium' : 'tabular'}>{autods.failedOrders24h}</span>
            </p>
          </div>
        </Card>

        <Card title="Supplier & inventory" subtitle="CJDropshipping stock and price watch">
          <ul className="space-y-3">
            {inventory.map((a) => (
              <li key={`${a.sku}-${a.type}`} className="text-xs leading-relaxed">
                <Pill tone={a.type === 'out_of_stock' ? 'red' : a.type === 'low_stock' ? 'amber' : 'blue'}>
                  {a.type.replace(/_/g, ' ')}
                </Pill>
                <p className="text-ink2 mt-1">{a.message}</p>
              </li>
            ))}
            {inventory.length === 0 && <p className="text-xs text-muted">No supplier alerts.</p>}
          </ul>
        </Card>

        <Card title="Support queue" subtitle={`Bot resolves ${Math.round((support.botDeflectionRate ?? 0) * 100)}% without a human`}>
          <div className="grid grid-cols-3 gap-2 text-center mb-4">
            <div className="bg-raised rounded-lg py-3">
              <p className="text-lg font-semibold text-ink tabular">{support.open}</p>
              <p className="text-[11px] text-muted mt-0.5">Open</p>
            </div>
            <div className="bg-raised rounded-lg py-3">
              <p className="text-lg font-semibold text-ink tabular">{support.resolvedByBot}</p>
              <p className="text-[11px] text-muted mt-0.5">Bot-resolved</p>
            </div>
            <div className="bg-raised rounded-lg py-3">
              <p className="text-lg font-semibold text-ink tabular">{support.satisfaction}</p>
              <p className="text-[11px] text-muted mt-0.5">CSAT</p>
            </div>
          </div>
          <ul className="space-y-2">
            {support.tickets.map((t) => (
              <li key={t.id} className="flex justify-between gap-2 text-xs">
                <span className="text-ink2 truncate">{t.subject}</span>
                <Pill tone={t.status === 'open' ? 'amber' : 'green'}>{t.status === 'open' ? 'needs human' : 'bot'}</Pill>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Recent orders" subtitle="Fulfillment is hands-off — flagged rows are the only ones needing attention">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-edge">
                <Th>Order</Th><Th>Customer</Th><Th>Product</Th><Th className="text-right">Total</Th><Th>Status</Th><Th>Auto-fulfilled</Th><Th>Placed</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-edge/60">
                  <Td className="text-ink font-medium tabular">{o.id}</Td>
                  <Td>{o.customer}</Td>
                  <Td className="max-w-[280px] truncate">{o.product}</Td>
                  <Td className="text-right tabular">{money(o.total)}</Td>
                  <Td><Pill tone={STATUS_TONE[o.status] ?? 'neutral'}>{o.status}</Pill></Td>
                  <Td>{o.autoFulfilled ? <span className="text-good">✓ auto</span> : <span className="text-warning">queued</span>}</Td>
                  <Td className="text-muted">{timeAgo(o.placedAt)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
