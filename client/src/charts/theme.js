// Chart tokens — mirrors the CSS custom properties so Recharts (which needs
// literal values) stays in sync with the validated palette.
export const SERIES = {
  blue: '#3987e5',
  aqua: '#199e70',
  yellow: '#c98500',
  violet: '#9085e9',
  red: '#e66767',
};

export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};

// Ordinal blue ramp for funnel stages (dark mode: no darker than step 600).
export const ORDINAL_BLUES = ['#86b6ef', '#5598e7', '#3987e5', '#256abf', '#184f95'];

export const INK = { primary: '#f4f4f2', secondary: '#c3c2b7', muted: '#898781' };
export const GRID = '#2a2c31';
export const SURFACE = '#16181d';

export const tooltipStyle = {
  contentStyle: {
    background: '#1c1f26',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: INK.primary,
    fontSize: 12,
  },
  labelStyle: { color: INK.secondary, marginBottom: 4 },
  itemStyle: { color: INK.primary },
  cursor: { stroke: '#3a3d44', strokeWidth: 1 },
};

export const axisProps = {
  stroke: 'transparent',
  tick: { fill: INK.muted, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: '#383835' },
};
