import { useState } from 'react';
import type { TrendPoint } from '../lib/derive';
import { monthLabel, monthShort, rupiah } from '../lib/format';

/* Gauge ------------------------------------------------------------------ */

export function Gauge({
  value,
  size = 118,
  label,
  thickness = 9,
  track = 'rgba(255, 255, 255, 0.24)',
  progress = '#ffffff',
  valueText,
}: {
  value: number;
  size?: number;
  label?: string;
  thickness?: number;
  track?: string;
  progress?: string;
  valueText?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.75;
  const ticks = 22;

  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <g transform="rotate(135 50 50)">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={track}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={progress}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${(arc * clamped) / 100} ${circumference}`}
            style={{ transition: 'stroke-dasharray 700ms cubic-bezier(.22,.8,.24,1)' }}
          />
        </g>
        <g>
          {Array.from({ length: ticks }, (_, i) => {
            const share = i / (ticks - 1);
            const angle = ((135 + share * 270) * Math.PI) / 180;
            const inner = 46.5;
            const outer = 49;
            return (
              <line
                key={i}
                x1={50 + Math.cos(angle) * inner}
                y1={50 + Math.sin(angle) * inner}
                x2={50 + Math.cos(angle) * outer}
                y2={50 + Math.sin(angle) * outer}
                stroke={share <= clamped / 100 ? progress : track}
                strokeWidth={1.8}
                strokeLinecap="round"
                opacity={share <= clamped / 100 ? 0.95 : 0.45}
              />
            );
          })}
        </g>
      </svg>
      <div className="gauge__center">
        <span className="gauge__value">{valueText ?? `${clamped}%`}</span>
        {label ? <span className="gauge__label">{label}</span> : null}
      </div>
    </div>
  );
}

/* Trend bars ------------------------------------------------------------- */

export function TrendBars({
  points,
  activeMonth,
  onPick,
}: {
  points: TrendPoint[];
  activeMonth: string;
  onPick?: (month: string) => void;
}) {
  const [hover, setHover] = useState<TrendPoint | null>(null);
  const max = Math.max(1, ...points.flatMap((p) => [p.income, p.expense]));
  const shown = hover ?? points.find((p) => p.month === activeMonth) ?? points[points.length - 1];

  return (
    <div>
      <div className="trend__headline">
        <span className="trend__big">{monthShort(shown.month)}</span>
        <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
          masuk {rupiah(shown.income)} · keluar {rupiah(shown.expense)}
        </span>
      </div>
      <div className="bars" role="group" aria-label="Tren pemasukan dan pengeluaran enam bulan">
        {points.map((point) => {
          const active = point.month === activeMonth;
          return (
            <button
              type="button"
              key={point.month}
              className={`bar-group${active ? ' is-active' : ''}`}
              onClick={() => onPick?.(point.month)}
              onMouseEnter={() => setHover(point)}
              onFocus={() => setHover(point)}
              onMouseLeave={() => setHover(null)}
              onBlur={() => setHover(null)}
              aria-label={`${monthLabel(point.month)}: pemasukan ${rupiah(point.income)}, pengeluaran ${rupiah(
                point.expense,
              )}`}
              style={{ background: 'none', padding: 0 }}
            >
              <span className="bar-pair">
                <span
                  className="bar bar--income"
                  style={{ height: `${Math.max(4, (point.income / max) * 100)}%` }}
                />
                <span
                  className="bar bar--expense"
                  style={{ height: `${Math.max(4, (point.expense / max) * 100)}%` }}
                />
              </span>
              <span className="bar-group__label">{monthShort(point.month)}</span>
            </button>
          );
        })}
      </div>
      <div className="legend" style={{ marginTop: 14 }}>
        <span>
          <i style={{ background: 'var(--teal)' }} /> Pemasukan
        </span>
        <span>
          <i style={{ background: 'var(--pink)' }} /> Pengeluaran
        </span>
      </div>
    </div>
  );
}

/* Progress --------------------------------------------------------------- */

export function Progress({
  value,
  state = 'safe',
  label,
}: {
  value: number;
  state?: 'safe' | 'warn' | 'over';
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={label}
    >
      <div
        className={`progress__fill${state !== 'safe' ? ` progress__fill--${state}` : ''}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
