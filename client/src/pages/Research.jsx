import { Fragment, useState } from 'react';
import { useApi, apiFetch } from '../api.js';
import { PageHeader } from '../components/Layout.jsx';
import { Card, Pill, Spinner, ErrorNote, Th, Td } from '../components/ui.jsx';
import { money, compact, int } from '../format.js';

const VERDICT_TONE = { winner: 'green', watchlist: 'amber', rejected: 'red' };

function GateList({ gates }) {
  return (
    <ul className="space-y-1">
      {gates.map((g) => (
        <li key={g.id} className={`text-xs flex gap-1.5 ${g.pass ? 'text-ink2' : 'text-critical'}`}>
          <span aria-hidden="true">{g.pass ? '✓' : '✗'}</span>
          {g.label}
        </li>
      ))}
    </ul>
  );
}

export function Research() {
  const { data, error, loading, refresh: refreshTrending } = useApi('/research/trending', { intervalMs: 300_000 });
  const { data: candData, refresh: refreshCandidates } = useApi('/research/candidates', { intervalMs: 0 });
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(null);

  if (loading) return <Spinner label="Scoring trending products…" />;
  if (error) return <ErrorNote error={error} />;

  const products = data.products;
  const candidates = candData?.candidates ?? [];
  const savedNames = new Set(candidates.map((c) => c.name));

  const save = async (p) => {
    setSaving(p.id);
    try {
      const { analysis, ...rest } = p;
      await apiFetch('/research/candidates', { method: 'POST', body: rest });
      await refreshCandidates();
    } finally {
      setSaving(null);
    }
  };

  const remove = async (id) => {
    await apiFetch(`/research/candidates/${id}`, { method: 'DELETE' });
    await refreshCandidates();
  };

  const updateNotes = async (id, notes) => {
    await apiFetch(`/research/candidates/${id}`, { method: 'PATCH', body: { notes } });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Product research"
        subtitle="Trending products scored against the winning-product framework. Hard-gate failures are rejected no matter the score."
        action={<button onClick={refreshTrending} className="text-xs text-ink2 border border-edge rounded-lg px-3 py-1.5 hover:bg-raised">Re-scan</button>}
      />

      <Card title="Trending now" subtitle="Signals: TikTok Creative Center · Meta Ad Library · Google Trends · AliExpress order velocity">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-edge">
                <Th>Product</Th><Th className="text-right">Score</Th><Th>Verdict</Th><Th className="text-right">Landed</Th>
                <Th className="text-right">Price</Th><Th className="text-right">Markup</Th><Th className="text-right">TikTok 7d</Th>
                <Th className="text-right">Ali orders 30d</Th><Th className="text-right">Competitors</Th><Th />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <Fragment key={p.id}>
                  <tr className="border-b border-edge/60">
                    <Td>
                      <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="text-left text-ink hover:underline">
                        {p.name}
                      </button>
                      <p className="text-[11px] text-muted mt-0.5">{p.category}</p>
                    </Td>
                    <Td className="text-right">
                      <span className={`font-semibold tabular ${p.analysis.score >= 70 ? 'text-ink' : 'text-ink2'}`}>{p.analysis.score}</span>
                      <span className="text-muted text-xs">/100</span>
                    </Td>
                    <Td><Pill tone={VERDICT_TONE[p.analysis.verdict]}>{p.analysis.verdict}</Pill></Td>
                    <Td className="text-right tabular">{money(p.analysis.landedCost)}</Td>
                    <Td className="text-right tabular">{money(p.suggestedPrice)}</Td>
                    <Td className={`text-right tabular ${p.analysis.markupMultiple >= 3 ? '' : 'text-critical'}`}>{p.analysis.markupMultiple}×</Td>
                    <Td className="text-right tabular">{compact(p.signals.tiktokViews7d)}</Td>
                    <Td className="text-right tabular">{int(p.signals.aliOrders30d)}</Td>
                    <Td className="text-right tabular">{p.signals.competingStores}</Td>
                    <Td className="text-right">
                      {savedNames.has(p.name) ? (
                        <span className="text-xs text-muted">saved</span>
                      ) : (
                        <button
                          onClick={() => save(p)}
                          disabled={saving === p.id}
                          className="text-xs text-s1 border border-s1/40 rounded-lg px-2.5 py-1 hover:bg-s1/10 disabled:opacity-50"
                        >
                          Save
                        </button>
                      )}
                    </Td>
                  </tr>
                  {expanded === p.id && (
                    <tr className="border-b border-edge/60 bg-raised/40">
                      <td colSpan={10} className="px-3 py-4">
                        <div className="grid md:grid-cols-3 gap-6">
                          <div>
                            <p className="text-xs font-medium text-ink mb-2">Hard gates</p>
                            <GateList gates={p.analysis.gates} />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-ink mb-2">Score breakdown</p>
                            <ul className="space-y-1">
                              {Object.entries(p.analysis.breakdown).map(([k, v]) => (
                                <li key={k} className="text-xs text-ink2 flex justify-between gap-4">
                                  <span className="capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                                  <span className="tabular">{v}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-ink mb-2">Signals</p>
                            <ul className="space-y-1 text-xs text-ink2">
                              <li>View velocity: {p.signals.viewVelocity}</li>
                              <li>Google Trends 90d: {p.signals.googleTrend90d}</li>
                              <li>Meta ads running 14d+: {p.signals.metaAdsRunning14d}</li>
                              <li>Amazon page one: {p.signals.amazonFirstPage ? 'yes — needs an angle' : 'no'}</li>
                              <li>Ships in {p.shippingDays} days</li>
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={`Saved candidates (${candidates.length})`} subtitle="Your shortlist — notes persist across restarts">
        {candidates.length === 0 ? (
          <p className="text-sm text-muted">Nothing saved yet. Save winners from the trending table to compare them here.</p>
        ) : (
          <ul className="divide-y divide-edge/60">
            {candidates.map((c) => (
              <li key={c.id} className="py-3 flex flex-col md:flex-row md:items-start gap-3">
                <div className="md:w-72 shrink-0">
                  <p className="text-sm text-ink">{c.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {c.analysis && <Pill tone={VERDICT_TONE[c.analysis.verdict]}>{c.analysis.verdict} · {c.analysis.score}</Pill>}
                    <button onClick={() => remove(c.id)} className="text-[11px] text-muted hover:text-critical">remove</button>
                  </div>
                </div>
                <textarea
                  defaultValue={c.notes}
                  placeholder="Notes — angle, target creative hooks, supplier options…"
                  onBlur={(e) => updateNotes(c.id, e.target.value)}
                  rows={2}
                  className="flex-1 bg-raised border border-edge rounded-lg px-3 py-2 text-xs text-ink2 placeholder:text-muted focus:outline-none focus:border-s1/60 resize-y"
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
