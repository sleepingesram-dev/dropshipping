import { useApi } from '../api.js';
import { PageHeader } from '../components/Layout.jsx';
import { Card, Pill, Spinner, ErrorNote, Th, Td } from '../components/ui.jsx';
import { RoasByCampaign, PacingRow } from '../charts/Charts.jsx';
import { money, roas as fmtRoas, pct } from '../format.js';

const PLATFORM_LABEL = { tiktok: 'TikTok', meta: 'Meta', google: 'Google' };

export function Ads() {
  const { data, error, loading } = useApi('/ads/campaigns', { intervalMs: 120_000 });
  const { data: creativeData } = useApi('/ads/creatives', { intervalMs: 300_000 });
  const { data: pacingData } = useApi('/ads/pacing', { intervalMs: 60_000 });

  if (loading) return <Spinner label="Pulling campaign data…" />;
  if (error) return <ErrorNote error={error} />;

  const campaigns = data.campaigns;
  const active = campaigns.filter((c) => c.status === 'active');
  // One break-even line: the max across products in play (conservative floor).
  const breakEvens = campaigns.map((c) => c.breakEvenRoas).filter((v) => v != null && isFinite(v));
  const breakEven = breakEvens.length ? Math.max(...breakEvens) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ad performance"
        subtitle="Cost per purchase and ROAS vs break-even are the only numbers that matter — everything else is context."
      />

      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="ROAS by campaign" subtitle="Trailing 7 full days · dashed line = worst-case break-even" className="lg:col-span-2">
          <RoasByCampaign campaigns={active} breakEven={breakEven} />
        </Card>
        <Card title="Spend pacing today" subtitle="Tick = share of day elapsed">
          <div className="divide-y divide-edge/60">
            {(pacingData?.pacing ?? []).map((row) => <PacingRow key={row.campaignId} row={row} />)}
          </div>
        </Card>
      </div>

      <Card title="Campaigns" subtitle="Kill anything below break-even for 2 straight days; scale winners +20% max per day">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-edge">
                <Th>Campaign</Th><Th>Platform</Th><Th>Status</Th>
                <Th className="text-right">Spend 7d</Th><Th className="text-right">Revenue 7d</Th>
                <Th className="text-right">ROAS</Th><Th className="text-right">Break-even</Th>
                <Th className="text-right">CPP</Th><Th className="text-right">CTR</Th><Th>Health</Th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const below = c.breakEvenRoas != null && c.last7.roas < c.breakEvenRoas && c.status === 'active';
                const healthy = c.breakEvenRoas != null && c.last7.roas >= 3;
                return (
                  <tr key={c.id} className="border-b border-edge/60">
                    <Td className="text-ink max-w-[300px] truncate">{c.name}</Td>
                    <Td>{PLATFORM_LABEL[c.platform] ?? c.platform}</Td>
                    <Td><Pill tone={c.status === 'active' ? 'green' : 'neutral'}>{c.status}</Pill></Td>
                    <Td className="text-right tabular">{money(c.last7.spend)}</Td>
                    <Td className="text-right tabular">{money(c.last7.revenue)}</Td>
                    <Td className={`text-right tabular font-medium ${below ? 'text-critical' : healthy ? 'text-good' : 'text-ink'}`}>
                      {c.status === 'active' ? fmtRoas(c.last7.roas) : '—'}
                    </Td>
                    <Td className="text-right tabular text-muted">{fmtRoas(c.breakEvenRoas)}</Td>
                    <Td className="text-right tabular">{c.last7.cpp ? money(c.last7.cpp) : '—'}</Td>
                    <Td className="text-right tabular">{pct(c.last7.ctr)}</Td>
                    <Td>
                      {c.status !== 'active' ? <span className="text-xs text-muted">paused</span>
                        : below ? <Pill tone="red">below break-even</Pill>
                        : healthy ? <Pill tone="green">healthy</Pill>
                        : <Pill tone="amber">between</Pill>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Creative performance" subtitle="TikTok creatives at 2%+ CTR are winners — duplicate the structure with new hooks before fatigue">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-edge">
                <Th>Hook</Th><Th>Format</Th><Th>Campaign</Th>
                <Th className="text-right">CTR</Th><Th className="text-right">Spend</Th>
                <Th className="text-right">Purchases</Th><Th className="text-right">CPP</Th><Th />
              </tr>
            </thead>
            <tbody>
              {(creativeData?.creatives ?? []).map((cr) => (
                <tr key={cr.id} className="border-b border-edge/60">
                  <Td className="text-ink max-w-[320px]">{cr.hook}</Td>
                  <Td>{cr.format}</Td>
                  <Td className="max-w-[220px] truncate text-muted">{cr.campaignName}</Td>
                  <Td className={`text-right tabular ${cr.isWinner ? 'text-good font-medium' : ''}`}>{pct(cr.ctr)}</Td>
                  <Td className="text-right tabular">{money(cr.spend)}</Td>
                  <Td className="text-right tabular">{cr.purchases}</Td>
                  <Td className="text-right tabular">{cr.cpp ? money(cr.cpp) : '—'}</Td>
                  <Td>{cr.isWinner && <Pill tone="green">winner — duplicate</Pill>}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
