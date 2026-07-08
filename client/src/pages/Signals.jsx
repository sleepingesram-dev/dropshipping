import { useApi, apiFetch } from '../api.js';
import { PageHeader } from '../components/Layout.jsx';
import { Card, SeverityBadge, Spinner, ErrorNote } from '../components/ui.jsx';
import { timeAgo } from '../format.js';

const KIND_LABEL = {
  scale_ready: 'Ready to scale',
  break_even_breach: 'Burning money',
  winner_creative: 'Winning creative',
  review_quality: 'Quality risk',
  automation_error: 'Automation error',
};

export function Signals() {
  const { data, error, loading, refresh } = useApi('/alerts', { intervalMs: 60_000 });
  const { data: liveScan } = useApi('/signals', { intervalMs: 300_000 });

  if (loading) return <Spinner label="Scanning for signals…" />;
  if (error) return <ErrorNote error={error} />;

  const alerts = data.alerts;
  const resolve = async (id) => {
    await apiFetch(`/alerts/${id}/resolve`, { method: 'POST' });
    await refresh();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Scaling signals & alerts"
        subtitle="The hourly scan flags what needs a human decision: scale, kill, duplicate, or investigate. Everything else stays automated."
        action={
          liveScan && (
            <span className="text-xs text-muted">
              Live scan: {liveScan.signals.length} signal{liveScan.signals.length === 1 ? '' : 's'} firing
            </span>
          )
        }
      />

      {alerts.length === 0 ? (
        <Card>
          <p className="text-sm text-muted py-6 text-center">
            No open signals. The scan runs hourly — new flags appear here and on the sidebar badge.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="bg-surface border border-edge rounded-xl p-4 flex items-start gap-4">
              <div className="pt-0.5 shrink-0"><SeverityBadge severity={a.severity} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">{KIND_LABEL[a.kind] ?? a.kind}</p>
                <p className="text-sm text-ink mt-1 leading-relaxed">{a.message}</p>
                <p className="text-[11px] text-muted mt-1.5">
                  First seen {timeAgo(a.createdAt)} · last confirmed {timeAgo(a.lastSeenAt)}
                </p>
              </div>
              <button
                onClick={() => resolve(a.id)}
                className="text-xs text-ink2 border border-edge rounded-lg px-3 py-1.5 hover:bg-raised shrink-0"
              >
                Mark handled
              </button>
            </div>
          ))}
        </div>
      )}

      <Card title="The scaling rules" subtitle="Encoded in the scanner — the same thresholds it alerts on">
        <ul className="text-xs text-ink2 space-y-2 leading-relaxed">
          <li><span className="text-good font-medium">Scale:</span> ROAS ≥ 3:1 for 7 straight days → raise budget, max +20% per day (algorithm stability requires gradual scaling).</li>
          <li><span className="text-good font-medium">Duplicate:</span> TikTok creative CTR ≥ 2% → replicate the hook structure with fresh variations before fatigue.</li>
          <li><span className="text-critical font-medium">Kill:</span> ROAS below break-even for 2 consecutive days → stop spend; never scale a loser hoping it turns around.</li>
          <li><span className="text-serious font-medium">Investigate:</span> product review score under 4.2 → order a CJ quality inspection before spending further.</li>
        </ul>
      </Card>
    </div>
  );
}
