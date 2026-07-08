import { useState } from 'react';
import { useApi, apiFetch } from '../api.js';
import { PageHeader } from '../components/Layout.jsx';
import { Card, Pill, Spinner, ErrorNote } from '../components/ui.jsx';

const INTEGRATION_LABELS = {
  shopify: 'Shopify (orders, products, revenue)',
  tiktok: 'TikTok Marketing API (campaign data)',
  meta: 'Meta Marketing API (campaign data)',
  cjdropshipping: 'CJDropshipping (inventory, prices)',
  autods: 'AutoDS (order automation webhooks)',
  klaviyo: 'Klaviyo (email flow status)',
  database: 'Storage',
};

function NumberField({ label, value, onChange, prefix, step = 0.1 }) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex items-center mt-1 bg-raised border border-edge rounded-lg focus-within:border-s1/60">
        {prefix && <span className="pl-3 text-xs text-muted">{prefix}</span>}
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent px-3 py-2 text-sm text-ink focus:outline-none"
        />
      </div>
    </label>
  );
}

export function Settings() {
  const { data, error, loading, refresh } = useApi('/settings', { intervalMs: 0 });
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);

  if (loading) return <Spinner label="Loading settings…" />;
  if (error) return <ErrorNote error={error} />;

  const settings = draft ?? data.settings;
  const set = (patch) => { setSaved(false); setDraft({ ...settings, ...patch }); };
  const setCost = (key, value) => set({ monthlyFixedCosts: { ...settings.monthlyFixedCosts, [key]: value } });

  const save = async () => {
    await apiFetch('/settings', { method: 'PUT', body: settings });
    setDraft(null);
    setSaved(true);
    await refresh();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Fee assumptions and guardrail thresholds feed the finance engine and the alert scanner directly."
        action={
          <div className="flex items-center gap-3">
            {saved && <span className="text-xs text-good">Saved ✓</span>}
            <button
              onClick={save}
              disabled={!draft}
              className="text-xs font-medium bg-s1 text-white rounded-lg px-4 py-2 disabled:opacity-40 hover:opacity-90"
            >
              Save changes
            </button>
          </div>
        }
      />

      <Card title="Integrations" subtitle="Add API keys in server/.env to flip an integration from demo to live — no code changes needed">
        <ul className="divide-y divide-edge/60">
          {Object.entries(data.integrations).map(([key, mode]) => (
            <li key={key} className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-sm text-ink2">{INTEGRATION_LABELS[key] ?? key}</span>
              <Pill tone={mode === 'live' || mode === 'postgres' ? 'green' : 'amber'}>
                {mode === 'file' ? 'file store' : mode}
              </Pill>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Payment fees" subtitle="Shopify Payments online rate (Basic plan)">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Fee percent" value={settings.shopifyFeePercent} onChange={(v) => set({ shopifyFeePercent: v })} prefix="%" />
            <NumberField label="Fixed per order" value={settings.shopifyFeeFixed} onChange={(v) => set({ shopifyFeeFixed: v })} prefix="$" step={0.05} />
          </div>
        </Card>

        <Card title="Guardrails" subtitle="Thresholds used by the alert scanner">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Healthy ROAS floor" value={settings.minRoasHealthy} onChange={(v) => set({ minRoasHealthy: v })} />
            <NumberField label="Scale-ready streak (days)" value={settings.scaleReadyDays} onChange={(v) => set({ scaleReadyDays: v })} step={1} />
            <NumberField label="Break-even breach (days)" value={settings.breakEvenBreachDays} onChange={(v) => set({ breakEvenBreachDays: v })} step={1} />
            <NumberField label="Winner creative CTR %" value={settings.winnerCtrPercent} onChange={(v) => set({ winnerCtrPercent: v })} />
            <NumberField label="Review score floor" value={settings.reviewScoreFloor} onChange={(v) => set({ reviewScoreFloor: v })} />
            <NumberField label="Max daily budget increase %" value={settings.maxDailyBudgetIncreasePercent} onChange={(v) => set({ maxDailyBudgetIncreasePercent: v })} step={5} />
          </div>
        </Card>
      </div>

      <Card title="Monthly app stack" subtitle="Feeds the fixed-cost line in the P&L and the break-even tracker">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(settings.monthlyFixedCosts).map(([key, value]) => (
            <NumberField key={key} label={key} value={value} onChange={(v) => setCost(key, v)} prefix="$" step={1} />
          ))}
        </div>
      </Card>
    </div>
  );
}
