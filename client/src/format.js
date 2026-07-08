const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-US');

export const money = (v) => (v == null ? '—' : usd.format(v));
export const money0 = (v) => (v == null ? '—' : usd0.format(v));
export const int = (v) => (v == null ? '—' : num.format(v));
export const pct = (v, digits = 1) => (v == null ? '—' : `${Number(v).toFixed(digits)}%`);
export const roas = (v) => (v == null || v === Infinity ? '—' : `${Number(v).toFixed(2)}:1`);

export const compact = (v) => {
  if (v == null) return '—';
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  return String(v);
};

export const timeAgo = (iso) => {
  if (!iso) return '—';
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const shortDay = (isoDate) => {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
