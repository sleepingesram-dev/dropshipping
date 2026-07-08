import { useState } from 'react';
import { useApi, apiFetch } from '../api.js';
import { PageHeader } from '../components/Layout.jsx';
import { Card, Toggle, Pill, Spinner, ErrorNote } from '../components/ui.jsx';
import { timeAgo } from '../format.js';

const OUTCOME_TONE = { ok: 'neutral', action_taken: 'blue', warning: 'amber', error: 'red' };

export function Automations() {
  const { data, error, loading, refresh } = useApi('/automations', { intervalMs: 60_000 });
  const { data: logData, refresh: refreshLog } = useApi('/automations/log?limit=60', { intervalMs: 30_000 });
  const { data: flowData } = useApi('/email/flows', { intervalMs: 300_000 });
  const [running, setRunning] = useState(null);

  if (loading) return <Spinner label="Loading automations…" />;
  if (error) return <ErrorNote error={error} />;

  const toggle = async (id, enabled) => {
    await apiFetch(`/automations/${id}`, { method: 'PATCH', body: { enabled } });
    await Promise.all([refresh(), refreshLog()]);
  };

  const runNow = async (id) => {
    setRunning(id);
    try {
      await apiFetch(`/automations/${id}/run`, { method: 'POST' });
      await Promise.all([refresh(), refreshLog()]);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Automation control center"
        subtitle="Every automated action is logged — nothing happens invisibly. Toggling off is the manual override."
      />

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Automations" subtitle="Scheduled on the intervals shown; 'Run now' forces an immediate pass">
          <ul className="divide-y divide-edge/60">
            {data.automations.map((a) => (
              <li key={a.id} className="py-3 flex items-start gap-3">
                <Toggle checked={a.enabled} onChange={(v) => toggle(a.id, v)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-ink">{a.name}</p>
                    {a.lastStatus && <Pill tone={OUTCOME_TONE[a.lastStatus] ?? 'neutral'}>{a.lastStatus.replace('_', ' ')}</Pill>}
                  </div>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{a.description}</p>
                  <p className="text-[11px] text-muted mt-1">
                    every {a.intervalMinutes >= 60 ? `${a.intervalMinutes / 60}h` : `${a.intervalMinutes}m`}
                    {a.lastRunAt && <> · last run {timeAgo(a.lastRunAt)}</>}
                  </p>
                </div>
                <button
                  onClick={() => runNow(a.id)}
                  disabled={running === a.id}
                  className="text-xs text-ink2 border border-edge rounded-lg px-2.5 py-1 hover:bg-raised disabled:opacity-50 shrink-0"
                >
                  {running === a.id ? 'Running…' : 'Run now'}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card title="Email flows (Klaviyo)" subtitle="Last 30 days">
            <ul className="divide-y divide-edge/60">
              {(flowData?.flows ?? []).map((f) => (
                <li key={f.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink2 truncate">{f.name}</p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {f.sent30d != null && `${f.sent30d} sent`}
                      {f.openRate != null && ` · ${Math.round(f.openRate * 100)}% open`}
                      {f.revenue30d ? ` · $${f.revenue30d.toFixed(0)} attributed` : ''}
                    </p>
                  </div>
                  <Pill tone={f.status === 'live' ? 'green' : 'amber'}>{f.status}</Pill>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Automation log" subtitle="Append-only record of every automated action">
            <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {(logData?.log ?? []).map((entry) => (
                <li key={entry.id} className="text-xs flex gap-2 items-start">
                  <span className="text-muted tabular shrink-0 w-16">{timeAgo(entry.at)}</span>
                  <Pill tone={OUTCOME_TONE[entry.outcome] ?? 'neutral'}>{entry.outcome.replace('_', ' ')}</Pill>
                  <span className="text-ink2 leading-relaxed">{entry.action}</span>
                </li>
              ))}
              {(logData?.log ?? []).length === 0 && (
                <p className="text-xs text-muted">No log entries yet — the scheduler writes here every cycle.</p>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
