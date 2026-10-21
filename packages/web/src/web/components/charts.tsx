import type { Stage } from "../lib/demo-data";

// Hand-built SVG charts. Every axis is labelled with its unit; reference lines are named.

const INK = "#111412";
const MUTED = "#6B716C";
const GRID = "#E4E2DA";

export function LineChart({
  series,
  xLabels,
  yLabel,
  height = 240,
  yDomain,
  yDigits = 1,
}: {
  series: { label: string; color: string; values: (number | undefined)[] }[];
  xLabels: string[];
  yLabel: string;
  height?: number;
  yDomain?: [number, number];
  yDigits?: number;
}) {
  const W = 640;
  const H = height;
  const pad = { l: 56, r: 16, t: 16, b: 36 };
  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== undefined);
  const [lo, hi] = yDomain ?? [Math.min(...all) * 0.98, Math.max(...all) * 1.02];
  const x = (i: number) => pad.l + (xLabels.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (xLabels.length - 1));
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-label={`${yLabel} over time`}>
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const v = lo + ((hi - lo) * i) / ticks;
        return (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={GRID} />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={MUTED} className="num">
              {v.toFixed(yDigits)}
            </text>
          </g>
        );
      })}
      <text x={12} y={pad.t + 4} fontSize="11" fill={MUTED} transform={`rotate(-90 12 ${pad.t + (H - pad.t - pad.b) / 2})`} textAnchor="middle">
        {yLabel}
      </text>
      {xLabels.map((l, i) => (
        <text key={l} x={x(i)} y={H - 12} textAnchor="middle" fontSize="11" fill={MUTED}>
          {l}
        </text>
      ))}
      {series.map((s) => {
        const pts = s.values.map((v, i) => (v === undefined ? null : [x(i), y(v)] as const));
        const d = pts
          .filter(Boolean)
          .map((p, i) => `${i === 0 ? "M" : "L"}${p![0]},${p![1]}`)
          .join(" ");
        return (
          <g key={s.label}>
            <path d={d} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" />
            {pts.map((p, i) =>
              p ? <circle key={i} cx={p[0]} cy={p[1]} r={4} fill="#fff" stroke={s.color} strokeWidth={2} /> : null,
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function Histogram({
  values,
  bins,
  lo,
  hi,
  color,
  unit,
  label,
  digits = 0,
}: {
  values: number[];
  bins: number;
  lo: number;
  hi: number;
  color: string;
  unit: string;
  label: string;
  digits?: number;
}) {
  const W = 420;
  const H = 180;
  const pad = { l: 28, r: 8, t: 10, b: 30 };
  const counts = Array.from({ length: bins }, () => 0);
  values.forEach((v) => {
    const i = Math.min(bins - 1, Math.max(0, Math.floor(((v - lo) / (hi - lo)) * bins)));
    counts[i]++;
  });
  const max = Math.max(1, ...counts);
  const bw = (W - pad.l - pad.r) / bins;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-label={`${label} distribution histogram`}>
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke={GRID} />
      {counts.map((c, i) => {
        const h = ((H - pad.t - pad.b) * c) / max;
        const bLo = lo + ((hi - lo) * i) / bins;
        const bHi = lo + ((hi - lo) * (i + 1)) / bins;
        return (
          <g key={i}>
            <rect x={pad.l + i * bw + 3} y={H - pad.b - h} width={bw - 6} height={h} fill={color} opacity={c ? 0.9 : 0.12} rx={2} />
            {c > 0 && (
              <text x={pad.l + i * bw + bw / 2} y={H - pad.b - h - 4} textAnchor="middle" fontSize="11" fill={INK} className="num">
                {c}
              </text>
            )}
            <text x={pad.l + i * bw + bw / 2} y={H - 12} textAnchor="middle" fontSize="10" fill={MUTED} className="num">
              {bLo.toFixed(digits)}
            </text>
            {i === bins - 1 && (
              <text x={pad.l + i * bw + bw} y={H - 12} textAnchor="end" fontSize="10" fill={MUTED} className="num">
                {bHi.toFixed(digits)}
              </text>
            )}
          </g>
        );
      })}
      <text x={pad.l} y={H - 0} fontSize="10" fill={MUTED}>
        {unit} · athletes (count shown above bars)
      </text>
    </svg>
  );
}

export function HBars({
  items,
  max,
  unit,
  digits = 1,
}: {
  items: { label: string; value?: number; color: string; sub?: string }[];
  max: number;
  unit: string;
  digits?: number;
}) {
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.label} className="grid grid-cols-[130px_1fr_78px] items-center gap-3 text-[13px]">
          <div className="truncate text-foreground">{it.label}</div>
          <div className="h-3 rounded-sm bg-muted overflow-hidden">
            {it.value !== undefined && (
              <div className="h-full rounded-sm" style={{ width: `${Math.min(100, (it.value / max) * 100)}%`, background: it.color }} />
            )}
          </div>
          <div className="text-right num text-foreground">
            {it.value === undefined ? <span className="text-muted-foreground">Not tested</span> : `${it.value.toFixed(digits)}${unit ? " " + unit : ""}`}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LactateCurve({ stages, lt1Speed, lt2Speed }: { stages: Stage[]; lt1Speed: number; lt2Speed: number }) {
  if (!stages.length) return <div className="text-muted-foreground text-sm">Not measured</div>;
  const W = 680;
  const H = 300;
  const pad = { l: 52, r: 24, t: 20, b: 44 };
  const xs = stages.map((s) => s.speedKmh);
  const xlo = Math.min(...xs) - 0.5;
  const xhi = Math.max(...xs) + 0.5;
  const ymax = Math.ceil(Math.max(...stages.map((s) => s.lactate)) + 1);
  const x = (v: number) => pad.l + ((v - xlo) / (xhi - xlo)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / ymax) * (H - pad.t - pad.b);
  const d = stages.map((s, i) => `${i === 0 ? "M" : "L"}${x(s.speedKmh)},${y(s.lactate)}`).join(" ");
  const yTicks = Array.from({ length: ymax + 1 }, (_, i) => i);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-label="Lactate curve">
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} />
          <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={MUTED} className="num">
            {t}
          </text>
        </g>
      ))}
      {stages.map((s) => (
        <text key={s.n} x={x(s.speedKmh)} y={H - 20} textAnchor="middle" fontSize="11" fill={MUTED} className="num">
          {s.speedKmh.toFixed(0)}
        </text>
      ))}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize="11" fill={MUTED}>
        Stage speed (km/h)
      </text>
      <text transform={`rotate(-90 14 ${H / 2})`} x={14} y={H / 2} textAnchor="middle" fontSize="11" fill={MUTED}>
        Blood lactate (mmol/L)
      </text>
      {/* reference thresholds */}
      <line x1={x(lt1Speed)} x2={x(lt1Speed)} y1={pad.t} y2={H - pad.b} stroke="#2F5D46" strokeDasharray="4 4" />
      <line x1={x(lt2Speed)} x2={x(lt2Speed)} y1={pad.t} y2={H - pad.b} stroke="#B3412B" strokeDasharray="4 4" />
      <text x={x(lt1Speed) + 6} y={pad.t + 12} fontSize="11" fill="#2F5D46" fontWeight={600}>LT1 · 2.0 mmol/L</text>
      <text x={x(lt2Speed) + 6} y={pad.t + 12} fontSize="11" fill="#B3412B" fontWeight={600}>LT2 · 4.0 mmol/L</text>
      <path d={d} fill="none" stroke="#111412" strokeWidth={2.5} />
      {stages.map((s) => (
        <circle key={s.n} cx={x(s.speedKmh)} cy={y(s.lactate)} r={4.5} fill="#fff" stroke="#111412" strokeWidth={2} />
      ))}
    </svg>
  );
}

export function Donut({ value, color = "#2F5D46", size = 96 }: { value: number; color?: string; size?: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label={`${value}%`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#E4E2DA" strokeWidth="10" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${(c * value) / 100} ${c}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="56" textAnchor="middle" fontSize="18" fontWeight="700" fill={INK} className="num">
        {value}%
      </text>
    </svg>
  );
}
