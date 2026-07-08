import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { SERIES, ORDINAL_BLUES, INK, GRID, tooltipStyle, axisProps } from './theme.js';
import { money0, shortDay, compact } from '../format.js';

const legendStyle = { fontSize: 12, color: INK.secondary };

// Revenue vs real profit, daily. Two series → legend + distinct hues.
export function RevenueProfitChart({ series, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
        <XAxis dataKey="date" {...axisProps} tickFormatter={shortDay} minTickGap={28} />
        <YAxis {...axisProps} tickFormatter={money0} width={58} />
        <Tooltip {...tooltipStyle} labelFormatter={shortDay} formatter={(v, name) => [money0(v), name]} />
        <Legend wrapperStyle={legendStyle} iconType="plainline" />
        <Line name="Revenue" type="monotone" dataKey="revenue" stroke={SERIES.blue} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line name="Net profit" type="monotone" dataKey="profit" stroke={SERIES.aqua} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Daily net profit — polarity encoding: blue above zero, red below (the
// diverging pair), neutral zero baseline.
export function DailyProfitBars({ rows, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="35%">
        <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
        <XAxis dataKey="date" {...axisProps} tickFormatter={shortDay} minTickGap={28} />
        <YAxis {...axisProps} tickFormatter={money0} width={58} />
        <Tooltip {...tooltipStyle} labelFormatter={shortDay} formatter={(v) => [money0(v), 'Net profit']} />
        <ReferenceLine y={0} stroke="#383835" />
        <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
          {rows.map((r) => (
            <Cell key={r.date} fill={r.profit >= 0 ? SERIES.blue : SERIES.red} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ROAS by campaign, horizontal, single hue (identity is the axis label);
// break-even threshold drawn as a dashed reference line.
export function RoasByCampaign({ campaigns, breakEven, height }) {
  const data = campaigns.map((c) => ({ name: c.name, roas: c.last7.roas, platform: c.platform }));
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(160, data.length * 44 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }} barCategoryGap="30%">
        <CartesianGrid stroke={GRID} strokeWidth={1} horizontal={false} />
        <XAxis type="number" {...axisProps} tickFormatter={(v) => `${v}:1`} domain={[0, 'auto']} />
        <YAxis type="category" dataKey="name" {...axisProps} width={230} tick={{ fill: INK.secondary, fontSize: 11 }} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${v}:1`, 'ROAS (7d)']} />
        {breakEven != null && (
          <ReferenceLine
            x={breakEven}
            stroke={INK.muted}
            strokeDasharray="4 4"
            label={{ value: `break-even ${breakEven}:1`, fill: INK.muted, fontSize: 10, position: 'insideTopRight' }}
          />
        )}
        <Bar dataKey="roas" fill={SERIES.blue} radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Conversion funnel — ordinal blue ramp, direct labels, horizontal bars.
export function FunnelBars({ stages, height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={stages} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 8 }} barCategoryGap="28%">
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" {...axisProps} width={110} tick={{ fill: INK.secondary, fontSize: 11 }} />
        <Tooltip {...tooltipStyle} formatter={(v) => [compact(v), 'count']} />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          barSize={16}
          label={{ position: 'right', fill: INK.secondary, fontSize: 11, formatter: compact }}
        >
          {stages.map((s, i) => (
            <Cell key={s.name} fill={ORDINAL_BLUES[Math.min(i, ORDINAL_BLUES.length - 1)]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Spend pacing — HTML meter row (a chart is the wrong form for two
// percentages per campaign): budget-used fill + day-elapsed tick.
export function PacingRow({ row }) {
  const behind = row.budgetUsed < row.dayElapsed - 18;
  const over = row.budgetUsed > 96;
  return (
    <div className="py-2.5">
      <div className="flex justify-between items-baseline mb-1.5 gap-2">
        <p className="text-xs text-ink2 truncate">{row.name}</p>
        <p className="text-[11px] text-muted tabular shrink-0">
          ${row.spendToday.toFixed(0)} / ${row.dailyBudget}
          {over ? ' · exhausted' : behind ? ' · under-pacing' : ''}
        </p>
      </div>
      <div className="relative h-2 rounded-full bg-raised overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${Math.min(100, row.budgetUsed)}%`, background: SERIES.blue }}
        />
        <div
          className="absolute inset-y-0 w-[2px] bg-ink2/70"
          style={{ left: `${Math.min(100, row.dayElapsed)}%` }}
          title={`${row.dayElapsed}% of day elapsed`}
        />
      </div>
    </div>
  );
}
