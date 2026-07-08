import { STATUS } from '../charts/theme.js';

export function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`bg-surface border border-edge rounded-xl p-5 ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatTile({ label, value, delta, deltaLabel, tone }) {
  const deltaColor = delta == null ? '' : delta >= 0 ? 'text-good' : 'text-critical';
  return (
    <div className="bg-surface border border-edge rounded-xl p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-2xl mt-1 font-semibold ${tone ?? 'text-ink'}`}>{value}</p>
      {delta != null && (
        <p className={`text-xs mt-1 ${deltaColor}`}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
          {deltaLabel && <span className="text-muted"> {deltaLabel}</span>}
        </p>
      )}
    </div>
  );
}

const SEVERITY_META = {
  good: { color: STATUS.good, icon: '▲', label: 'Opportunity' },
  warning: { color: STATUS.warning, icon: '◆', label: 'Warning' },
  serious: { color: STATUS.serious, icon: '◆', label: 'Serious' },
  critical: { color: STATUS.critical, icon: '●', label: 'Critical' },
};

// Status always ships icon + label — never color alone.
export function SeverityBadge({ severity }) {
  const meta = SEVERITY_META[severity] ?? SEVERITY_META.warning;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border"
      style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}14` }}
    >
      <span aria-hidden="true" className="text-[9px]">{meta.icon}</span>
      {meta.label}
    </span>
  );
}

export function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'text-ink2 border-edge bg-raised',
    blue: 'text-s1 border-s1/40 bg-s1/10',
    green: 'text-good border-good/40 bg-good/10',
    red: 'text-critical border-critical/40 bg-critical/10',
    amber: 'text-warning border-warning/40 bg-warning/10',
  };
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-[22px] rounded-full transition-colors shrink-0 ${
        checked ? 'bg-s2' : 'bg-[#33363e]'
      } ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all ${
          checked ? 'left-[21px]' : 'left-[3px]'
        }`}
      />
    </button>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-2 text-muted text-sm py-8 justify-center">
      <span className="w-4 h-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
      {label}
    </div>
  );
}

export function ErrorNote({ error }) {
  return (
    <div className="text-sm text-critical bg-critical/10 border border-critical/30 rounded-lg px-4 py-3">
      Couldn't reach the server: {error.message}. Is <code>npm run dev</code> running?
    </div>
  );
}

export function Th({ children, className = '' }) {
  return <th className={`text-left text-[11px] uppercase tracking-wide font-medium text-muted px-3 py-2 ${className}`}>{children}</th>;
}

export function Td({ children, className = '' }) {
  return <td className={`px-3 py-2.5 text-sm text-ink2 align-top ${className}`}>{children}</td>;
}
