import type { ReactNode } from "react";
import { Link } from "wouter";
import {
  BLOCKS,
  GROUP_FILTERS,
  MIN_GROUP_N,
  PEAKING_STATUSES,
  REST_COLOR,
  REST_LABEL,
  REST_STATUSES,
  aggText,
  changeText,
  classify,
  daysUntil,
  filterAthletes,
  fmtDate,
  fmtNum,
  fmtPace,
  groupAvg,
  groupOf,
  isDueForRetest,
  peakTone,
  periodValues,
  recentSessions,
  restTone,
  teamStats,
  trendTone,
  type Athlete,
  type GroupFilter,
  type PeakingStatus,
  type RestStatus,
  type Trend,
} from "../lib/demo-data";
import { TESTING_PERIODS, type TestingPeriod, type WidgetConfig, type WidgetSize } from "../lib/dashboard";
import { Donut, HBars, LineChart } from "./charts";
import { SourceTag, StatusPill, TrendPill } from "./shell";
import { useSquad } from "../hooks/use-squad";
import { cn } from "@/lib/utils";

export const GROUP_COLOR = { Forwards: "#2f5d46", Backs: "#b9793a" } as const;

export type DrawerState =
  | { kind: "rest"; status?: RestStatus }
  | { kind: "peaking"; status?: PeakingStatus }
  | { kind: "athlete"; id: string; from?: DrawerState }
  | null;

interface WidgetProps {
  config: WidgetConfig;
  onChange: (c: WidgetConfig) => void;
  openDrawer: (d: DrawerState) => void;
}

const label11 = "text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold";

function Tile({ label, value, unit, sub, accent, children }: { label: string; value: string; unit?: string; sub?: string; accent?: string; children?: ReactNode }) {
  return (
    <div className="relative rounded-[8px] border border-border/80 bg-background/50 p-4 overflow-hidden min-w-0">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent ?? "#2f5d46" }} />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className={label11}>{label}</div>
          <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
            <span className="font-display text-[34px] leading-none num">{value}</span>
            {unit && <span className="text-[12px] text-muted-foreground">{unit}</span>}
          </div>
          {sub && <div className="mt-1.5 text-[12px] text-muted-foreground">{sub}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- A. Team overview ----------

export function OverviewWidget({ config }: WidgetProps) {
  const { athletes: ATHLETES, team: TEAM } = useSquad();
  const s = teamStats(ATHLETES);
  const m = config.overviewMetrics ?? [];
  const cols = config.size === "S" ? "grid-cols-1" : config.size === "M" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-5";
  if (!m.length) return <Empty text="No metrics selected. Open block settings to choose metrics." />;
  return (
    <div className={cn("grid gap-3", cols)}>
      {m.includes("total") && <Tile label="Total athletes" value={String(s.total)} sub={`${TEAM.name} squad`} />}
      {m.includes("tested") && <Tile label="Athletes tested" value={String(s.tested)} sub="At least one published or pending test" />}
      {m.includes("completion") && (
        <Tile label="Testing completion" value={`${s.completion}%`} sub={`${s.tested} of ${s.total}`} accent="#2f5d46">
          {config.size !== "S" && <Donut value={s.completion} size={64} />}
        </Tile>
      )}
      {m.includes("notTested") && <Tile label="Not yet tested" value={String(s.notTested)} sub="No baseline on record" accent="#6b716c" />}
      {m.includes("due") && <Tile label="Due for retesting" value={String(s.due)} sub="Last test older than 120 days" accent="#b9793a" />}
    </div>
  );
}

// ---------- B. Physiological performance ----------

export function PhysioWidget({ config, onChange }: WidgetProps) {
  const { athletes: ATHLETES } = useSquad();
  const filter = config.filter ?? "All athletes";
  const period = config.period ?? "Latest result";
  const metrics = config.physioMetrics ?? [];
  const list = filterAthletes(ATHLETES, filter);
  const rows = list.map((a) => ({ a, v: periodValues(a, period) })).filter((r) => r.v !== undefined) as { a: Athlete; v: NonNullable<ReturnType<typeof periodValues>> }[];
  const vs = rows.map((r) => r.v);
  const avg = (pick: (v: (typeof vs)[number]) => number | undefined) => groupAvg(vs, pick);
  const vo2 = avg((v) => v.vo2);
  const lt1 = avg((v) => v.lt1Pace);
  const lt2 = avg((v) => v.lt2Pace);
  const lt1Hr = avg((v) => v.lt1Hr);
  const lt2Hr = avg((v) => v.lt2Hr);
  const sweat = avg((v) => v.sweatRate);
  const mixed = filter === "All athletes";
  const tileCols = config.size === "S" ? "grid-cols-1" : config.size === "M" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";
  const paceTile = (labelText: string, a: { n: number; value?: number }, accent: string) =>
    mixed ? (
      <Tile label={labelText} value="Not averaged" sub="Forwards and backs are not pooled for pace. Choose a group or position." accent={accent} />
    ) : (
      <Tile label={labelText} value={a.value !== undefined ? fmtPace(a.value) : "—"} unit={a.value !== undefined ? "/km" : undefined} sub={a.value !== undefined ? `n = ${a.n} · same treadmill protocol` : aggText(undefined, a.n)} accent={accent} />
    );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          aria-label="Position filter"
          value={filter}
          onChange={(e) => onChange({ ...config, filter: e.target.value as GroupFilter })}
          className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px]"
        >
          {GROUP_FILTERS.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select
          aria-label="Testing period"
          value={period}
          onChange={(e) => onChange({ ...config, period: e.target.value as TestingPeriod })}
          className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px]"
        >
          {TESTING_PERIODS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <span className="text-[12px] text-muted-foreground">
          {rows.length} of {list.length} athletes have data for this period
        </span>
        <span className="ml-auto">
          <SourceTag kind="Measured" />
        </span>
      </div>

      {!metrics.length && <Empty text="No metrics selected. Open block settings to choose metrics." />}

      <div className={cn("grid gap-3", tileCols)}>
        {metrics.includes("vo2") && (
          <Tile label="Average VO₂max" value={vo2.value !== undefined ? vo2.value.toFixed(1) : "—"} unit={vo2.value !== undefined ? "ml/kg/min" : undefined} sub={vo2.value !== undefined ? `n = ${vo2.n}` : aggText(undefined, vo2.n)} accent="#b9793a" />
        )}
        {metrics.includes("lt1") && paceTile("Average aerobic threshold (LT1)", lt1, "#7c8f86")}
        {metrics.includes("lt2") && paceTile("Average anaerobic threshold (LT2)", lt2, "#b3412b")}
        {metrics.includes("thresholdHr") && (
          <Tile
            label="Average threshold HR"
            value={lt2Hr.value !== undefined ? String(Math.round(lt2Hr.value)) : "—"}
            unit={lt2Hr.value !== undefined ? "bpm at LT2" : undefined}
            sub={
              lt2Hr.value !== undefined
                ? `LT1 ${lt1Hr.value !== undefined ? Math.round(lt1Hr.value) : "—"} bpm · n = ${lt2Hr.n}`
                : period === "Mar 2026 block"
                  ? "Heart rate not kept for this block"
                  : aggText(undefined, lt2Hr.n)
            }
            accent="#3c4a56"
          />
        )}
        {metrics.includes("sweat") && (
          <Tile
            label="Average sweat rate"
            value={sweat.value !== undefined ? sweat.value.toFixed(1) : "—"}
            unit={sweat.value !== undefined ? "L/h" : undefined}
            sub={sweat.value !== undefined ? `n = ${sweat.n} sweat-tested` : sweat.n === 0 ? "No sweat tests in this period" : aggText(undefined, sweat.n)}
            accent="#2f5d46"
          />
        )}
      </div>

      {metrics.includes("compare") && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <div className={label11}>Individual comparison · VO₂max (ml/kg/min)</div>
            <div className="flex gap-3 text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_COLOR.Forwards }} /> Forwards
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_COLOR.Backs }} /> Backs
              </span>
            </div>
          </div>
          <div className={cn("overflow-y-auto pr-1", config.size === "L" ? "max-h-[360px]" : "max-h-[260px]")}>
            {rows.filter((r) => r.v.vo2 !== undefined).length === 0 ? (
              <Empty text="No VO₂max results for this filter and period." />
            ) : (
              <HBars
                max={70}
                unit=""
                items={rows
                  .filter((r) => r.v.vo2 !== undefined)
                  .sort((x, y) => (y.v.vo2 ?? 0) - (x.v.vo2 ?? 0))
                  .map((r) => ({ label: r.a.name, value: r.v.vo2, color: GROUP_COLOR[groupOf(r.a)] }))}
              />
            )}
          </div>
          <p className="mt-2 text-[11.5px] text-muted-foreground">Identifiable values: visible to coaches under team coaching consent (demo).</p>
        </div>
      )}
      <p className="mt-4 text-[11.5px] text-muted-foreground">
        Averages need at least {MIN_GROUP_N} athletes with a comparable result. Pace is averaged only within one group or position.
      </p>
    </div>
  );
}

// ---------- C. Rest required ----------

export function RestWidget({ config, openDrawer }: WidgetProps) {
  const { athletes: ATHLETES } = useSquad();
  const counts = REST_STATUSES.map((s) => ({ s, n: ATHLETES.filter((a) => a.rest.status === s).length }));
  const flagged = ATHLETES.filter((a) => a.rest.status === "Red" || a.rest.status === "Amber");
  const small = config.size === "S";
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <SourceTag kind="Coach assessment" />
        <button onClick={() => openDrawer({ kind: "rest" })} className="text-[12.5px] font-semibold text-[#2f5d46] hover:underline">
          All athletes →
        </button>
      </div>
      <div className={cn("grid gap-2", small ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
        {counts.map(({ s, n }) => (
          <button
            key={s}
            onClick={() => openDrawer({ kind: "rest", status: s })}
            className="text-left rounded-[8px] border border-border/80 bg-background/50 p-3 hover:border-[#2f5d46] transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: REST_COLOR[s] }} />
              <span className="text-[11px] uppercase tracking-[0.12em] font-semibold">{s}</span>
            </div>
            <div className="font-display text-[30px] leading-none mt-1.5 num">{n}</div>
            {!small && <div className="text-[11.5px] text-muted-foreground mt-1 leading-snug">{REST_LABEL[s]}</div>}
          </button>
        ))}
      </div>
      {!small && flagged.length > 0 && (
        <ul className="mt-4 divide-y divide-border/70 border-t border-border/70">
          {flagged
            .sort((a, b) => (a.rest.status === "Red" ? -1 : 1) - (b.rest.status === "Red" ? -1 : 1))
            .map((a) => (
              <li key={a.id}>
                <button onClick={() => openDrawer({ kind: "athlete", id: a.id })} className="w-full text-left py-2.5 flex items-center justify-between gap-3 hover:bg-background/60 px-1">
                  <div className="min-w-0">
                    <div className="font-semibold text-[13.5px] truncate">{a.name}</div>
                    <div className="text-[12px] text-muted-foreground truncate">
                      {a.position} · assessed {fmtDate(a.rest.assessedOn)}
                    </div>
                  </div>
                  <TrendPill tone={restTone(a.rest.status)} label={a.rest.status} />
                </button>
              </li>
            ))}
        </ul>
      )}
      <p className="mt-3 text-[11.5px] text-muted-foreground">Manually entered by coaching staff. Not derived from VO₂max or lactate, and not a medical diagnosis.</p>
    </div>
  );
}

// ---------- D. Possible peaking ----------

const PEAK_COLOR: Record<PeakingStatus, string> = {
  "Competition ready — coach assessed": "#2f5d46",
  "Potentially approaching peak": "#5f8b72",
  Tapering: "#b9793a",
  Building: "#7c8f86",
  Maintaining: "#c9cdc5",
  "Insufficient data": "#e4e2da",
};

export function PeakingWidget({ config, openDrawer }: WidgetProps) {
  const { athletes: ATHLETES } = useSquad();
  const counts = PEAKING_STATUSES.map((s) => ({ s, n: ATHLETES.filter((a) => a.peaking.status === s).length }));
  const watch = ATHLETES.filter((a) => a.peaking.status === "Competition ready — coach assessed" || a.peaking.status === "Potentially approaching peak" || a.peaking.status === "Tapering");
  const small = config.size === "S";
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <SourceTag kind="Coach assessment" />
        <button onClick={() => openDrawer({ kind: "peaking" })} className="text-[12.5px] font-semibold text-[#2f5d46] hover:underline">
          All athletes →
        </button>
      </div>
      <div className="flex h-3 rounded-sm overflow-hidden mb-3" aria-hidden>
        {counts.map(({ s, n }) => (n ? <div key={s} style={{ width: `${(n / ATHLETES.length) * 100}%`, background: PEAK_COLOR[s] }} /> : null))}
      </div>
      <ul className="space-y-1">
        {counts.map(({ s, n }) => (
          <li key={s}>
            <button onClick={() => openDrawer({ kind: "peaking", status: s })} className="w-full flex items-center justify-between gap-3 rounded px-1.5 py-1 hover:bg-background/70 text-left">
              <span className="inline-flex items-center gap-2 text-[13px] min-w-0">
                <i className="h-2.5 w-2.5 rounded-sm shrink-0 border border-border/60" style={{ background: PEAK_COLOR[s] }} />
                <span className="truncate">{s}</span>
              </span>
              <span className="font-display text-[18px] num">{n}</span>
            </button>
          </li>
        ))}
      </ul>
      {!small && (
        <div className="mt-4 border-t border-border/70 pt-3">
          <div className={label11 + " mb-2"}>Watch list</div>
          <div className="flex flex-wrap gap-1.5">
            {watch.map((a) => (
              <button
                key={a.id}
                onClick={() => openDrawer({ kind: "athlete", id: a.id })}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[12.5px] hover:border-[#2f5d46]"
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="mt-3 text-[11.5px] text-muted-foreground">Assigned by the coach. Peak performance is not predicted from VO₂max or lactate testing.</p>
    </div>
  );
}

// ---------- E. Testing history ----------

const TREND_ORDER: Trend[] = ["Improving", "Stable", "Mixed", "Requires investigation", "No comparison"];

export function HistoryWidget({ config }: WidgetProps) {
  const { athletes: ATHLETES, plannedTests: PLANNED_TESTS } = useSquad();
  const sessions = recentSessions(ATHLETES).slice(0, 3);
  const due = ATHLETES.filter(isDueForRetest);
  const notTested = ATHLETES.filter((a) => !a.tested);
  const trends = TREND_ORDER.map((t) => ({ t, n: ATHLETES.filter((a) => a.tested && classify(a) === t).length }));
  const wide = config.size === "L";
  return (
    <div className={cn("grid gap-5", wide ? "md:grid-cols-2 xl:grid-cols-4" : "grid-cols-1")}>
      <section>
        <div className={label11 + " mb-2"}>Recent tests</div>
        <ul className="space-y-1.5 text-[13px]">
          {sessions.map((s) => (
            <li key={s.date} className="flex justify-between gap-3">
              <span>
                <span className="num font-semibold">{fmtDate(s.date)}</span> <span className="text-muted-foreground">· {s.label}</span>
              </span>
              <span className="num text-muted-foreground whitespace-nowrap">n = {s.athletes.length}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <div className={label11 + " mb-2"}>Upcoming tests</div>
        <ul className="space-y-1.5 text-[13px]">
          {PLANNED_TESTS.map((t) => (
            <li key={t.date} className="flex justify-between gap-3">
              <span>
                <span className="num font-semibold">{fmtDate(t.date)}</span> <span className="text-muted-foreground">· {t.label}</span>
              </span>
              <span className="num text-muted-foreground whitespace-nowrap">in {daysUntil(t.date)} d</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <div className={label11 + " mb-2"}>Requires retesting</div>
        <ul className="space-y-1.5 text-[13px]">
          {due.map((a) => (
            <li key={a.id} className="flex justify-between gap-3">
              <Link href={`/athletes/${a.id}`} className="hover:underline font-semibold">
                {a.name}
              </Link>
              <TrendPill tone="ochre" label="Due" />
            </li>
          ))}
          {notTested.map((a) => (
            <li key={a.id} className="flex justify-between gap-3">
              <Link href={`/athletes/${a.id}`} className="hover:underline">
                {a.name}
              </Link>
              <TrendPill tone="stone" label="No baseline" />
            </li>
          ))}
        </ul>
      </section>
      <section>
        <div className={label11 + " mb-2"}>Change since previous test</div>
        <ul className="space-y-1.5 text-[13px]">
          {trends.map(({ t, n }) => (
            <li key={t} className="flex items-center justify-between gap-3">
              <TrendPill tone={trendTone(t)} label={t} />
              <span className="font-display text-[18px] num">{n}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11.5px] text-muted-foreground">Practitioner thresholds: VO₂ ±1.0 ml/kg/min, LT2 ±3 s/km.</p>
      </section>
    </div>
  );
}

// ---------- F. Team development ----------

function paired(ATHLETES: Athlete[], group: "Forwards" | "Backs") {
  return ATHLETES.filter((a) => groupOf(a) === group && a.prevTest === BLOCKS.mar && a.lastTest === BLOCKS.sep);
}

export function DevelopmentWidget({ config }: WidgetProps) {
  const { athletes: ATHLETES } = useSquad();
  const f = paired(ATHLETES, "Forwards");
  const b = paired(ATHLETES, "Backs");
  const mean = (xs: (number | undefined)[]) => {
    const v = xs.filter((x): x is number => x !== undefined);
    return v.length >= MIN_GROUP_N ? v.reduce((s, x) => s + x, 0) / v.length : undefined;
  };
  const xLabels = ["Mar 2026 block", "Sep 2026 block"];
  const marN = ATHLETES.filter((a) => a.prevTest === BLOCKS.mar).length;
  const sepN = ATHLETES.filter((a) => a.lastTest === BLOCKS.sep).length;
  const wide = config.size === "L";
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <SourceTag kind="Measured" />
        <span className="text-[12px] text-muted-foreground">
          Paired athletes only (tested in both blocks, same protocol): forwards n = {f.length}, backs n = {b.length}
        </span>
      </div>
      <div className={cn("grid gap-5", wide ? "lg:grid-cols-3" : "grid-cols-1")}>
        <div className="min-w-0">
          <div className={label11 + " mb-1"}>VO₂max trend (ml/kg/min)</div>
          <LineChart
            height={200}
            xLabels={xLabels}
            yLabel="VO₂max"
            series={[
              { label: "Forwards", color: GROUP_COLOR.Forwards, values: [mean(f.map((a) => a.vo2Prev)), mean(f.map((a) => a.vo2))] },
              { label: "Backs", color: GROUP_COLOR.Backs, values: [mean(b.map((a) => a.vo2Prev)), mean(b.map((a) => a.vo2))] },
            ]}
          />
        </div>
        <div className="min-w-0">
          <div className={label11 + " mb-1"}>LT2 pace development (s/km, lower is faster)</div>
          <LineChart
            height={200}
            xLabels={xLabels}
            yLabel="LT2 s/km"
            yDigits={0}
            series={[
              { label: "Forwards", color: GROUP_COLOR.Forwards, values: [mean(f.map((a) => a.lt2PacePrev)), mean(f.map((a) => a.lt2Pace))] },
              { label: "Backs", color: GROUP_COLOR.Backs, values: [mean(b.map((a) => a.lt2PacePrev)), mean(b.map((a) => a.lt2Pace))] },
            ]}
          />
          <p className="text-[11.5px] text-muted-foreground">Forwards and backs are plotted separately and never pooled.</p>
        </div>
        <div className="min-w-0">
          <div className={label11 + " mb-2"}>Testing completion by block</div>
          {[
            { l: "Mar 2026 block", n: marN },
            { l: "Sep 2026 block", n: sepN },
          ].map((r) => (
            <div key={r.l} className="mb-3">
              <div className="flex justify-between text-[13px] mb-1">
                <span>{r.l}</span>
                <span className="num text-muted-foreground">
                  {r.n} of {ATHLETES.length} · {Math.round((r.n / ATHLETES.length) * 100)}%
                </span>
              </div>
              <div className="h-3 rounded-sm bg-muted overflow-hidden">
                <div className="h-full bg-[#2f5d46]" style={{ width: `${(r.n / ATHLETES.length) * 100}%` }} />
              </div>
            </div>
          ))}
          <p className="text-[11.5px] text-muted-foreground">Uses current squad membership as the denominator for both blocks (demo).</p>
        </div>
      </div>
      <div className="mt-2 flex gap-4 text-[11.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_COLOR.Forwards }} /> Forwards
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_COLOR.Backs }} /> Backs
        </span>
        <span>Two blocks only: a line between two points is not a trend.</span>
      </div>
    </div>
  );
}

// ---------- G. Upcoming competitions ----------

export function FixturesWidget({ config }: WidgetProps) {
  const { fixtures: FIXTURES, plannedTests: PLANNED_TESTS } = useSquad();
  const upcoming = FIXTURES.filter((f) => daysUntil(f.date) >= 0);
  const next = upcoming[0];
  const wide = config.size !== "S";
  return (
    <div className={cn("grid gap-5", wide ? "sm:grid-cols-[auto_1fr]" : "grid-cols-1")}>
      {next ? (
        <div className="rounded-[8px] bg-[#16201a] text-[#f5f4ef] p-4 min-w-[170px]">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#9fb3a4]">Next match in</div>
          <div className="font-display text-[48px] leading-none num mt-1">{daysUntil(next.date)}</div>
          <div className="text-[12px] text-[#c9cdc5]">days · {fmtDate(next.date)}</div>
          <div className="mt-3 text-[13px] font-semibold leading-snug">
            {next.venue === "Home" ? "vs" : "@"} {next.opponent}
          </div>
          <div className="text-[11.5px] text-[#9fb3a4]">{next.competition}</div>
        </div>
      ) : (
        <Empty text="No upcoming fixtures." />
      )}
      <div className="min-w-0">
        <div className={label11 + " mb-2"}>Fixtures</div>
        <ul className="divide-y divide-border/70 text-[13px]">
          {upcoming.slice(1).map((f) => (
            <li key={f.date} className="py-1.5 flex justify-between gap-3">
              <span className="min-w-0 truncate">
                <span className="num font-semibold">{fmtDate(f.date)}</span> · {f.venue === "Home" ? "vs" : "@"} {f.opponent}
              </span>
              <span className="num text-muted-foreground whitespace-nowrap">{daysUntil(f.date)} d</span>
            </li>
          ))}
        </ul>
        <div className={label11 + " mt-3 mb-2"}>Planned testing</div>
        <ul className="text-[13px] space-y-1">
          {PLANNED_TESTS.map((t) => (
            <li key={t.date} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                <span className="num font-semibold">{fmtDate(t.date)}</span> · {t.label}
              </span>
              <span className="num text-muted-foreground whitespace-nowrap">{daysUntil(t.date)} d</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------- Squad table ----------

export function SquadWidget({ config }: WidgetProps) {
  const { athletes: ATHLETES } = useSquad();
  const compact = config.size !== "L";
  return (
    <div className="overflow-x-auto -mx-5">
      <div className={cn(compact && "max-h-[420px] overflow-y-auto")}>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-5 py-2 font-semibold">Athlete</th>
              <th className="px-3 py-2 font-semibold">Position</th>
              {!compact && <th className="px-3 py-2 font-semibold text-right">VO₂max</th>}
              <th className="px-3 py-2 font-semibold">Rest</th>
              {!compact && <th className="px-3 py-2 font-semibold">Peaking</th>}
              <th className="px-5 py-2 font-semibold text-right">Passport</th>
            </tr>
          </thead>
          <tbody>
            {ATHLETES.map((a) => (
              <tr key={a.id} className="border-t border-border/70">
                <td className="px-5 py-2 font-semibold whitespace-nowrap">{a.name}</td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{a.position}</td>
                {!compact && <td className="px-3 py-2 text-right num">{a.tested ? fmtNum(a.vo2) : "Not tested"}</td>}
                <td className="px-3 py-2">
                  <TrendPill tone={restTone(a.rest.status)} label={a.rest.status} />
                </td>
                {!compact && <td className="px-3 py-2 text-[12.5px] whitespace-nowrap">{a.peaking.status}</td>}
                <td className="px-5 py-2 text-right whitespace-nowrap">
                  <Link href={`/athletes/${a.id}`} className="text-[12.5px] font-semibold text-[#2f5d46] hover:underline">
                    View passport →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-[13px] text-muted-foreground py-3">{text}</div>;
}

export const WIDGETS = {
  overview: OverviewWidget,
  physio: PhysioWidget,
  rest: RestWidget,
  peaking: PeakingWidget,
  history: HistoryWidget,
  development: DevelopmentWidget,
  fixtures: FixturesWidget,
  squad: SquadWidget,
} satisfies Record<WidgetConfig["type"], (p: WidgetProps) => ReactNode>;

export const SIZE_LABEL: Record<WidgetSize, string> = { S: "Small", M: "Medium", L: "Large" };

// ---------- drawer content ----------

export function DrawerBody({ state, openDrawer }: { state: NonNullable<DrawerState>; openDrawer: (d: DrawerState) => void }) {
  const { athletes: ATHLETES, getAthlete } = useSquad();
  if (state.kind === "athlete") {
    const a = getAthlete(state.id);
    if (!a) return <Empty text="Athlete not found." />;
    return <AthleteSupport a={a} back={state.from ? () => openDrawer(state.from!) : undefined} />;
  }
  if (state.kind === "rest") {
    const statuses = state.status ? [state.status] : REST_STATUSES;
    return (
      <div className="space-y-6">
        <Notice>Coach-entered recovery assessments (fictional). Not derived from VO₂max or lactate and not a medical diagnosis.</Notice>
        {statuses.map((s) => {
          const list = ATHLETES.filter((a) => a.rest.status === s);
          return (
            <section key={s}>
              <div className="flex items-center gap-2 mb-2">
                <i className="h-2.5 w-2.5 rounded-full" style={{ background: REST_COLOR[s] }} />
                <h3 className="font-display text-[16px] uppercase tracking-wide">
                  {s} · {REST_LABEL[s]}
                </h3>
                <span className="ml-auto num text-[13px] text-muted-foreground">{list.length}</span>
              </div>
              <AthleteRows
                list={list}
                meta={(a) => `${a.position} · ${a.rest.assessedOn ? `assessed ${fmtDate(a.rest.assessedOn)}` : "no assessment date"}`}
                note={(a) => a.rest.note}
                onOpen={(a) => openDrawer({ kind: "athlete", id: a.id, from: state })}
              />
            </section>
          );
        })}
      </div>
    );
  }
  const statuses = state.status ? [state.status] : PEAKING_STATUSES;
  return (
    <div className="space-y-6">
      <Notice>Coach-assigned peaking status (fictional). Peak performance is not predicted from VO₂max or lactate testing alone.</Notice>
      {statuses.map((s) => {
        const list = ATHLETES.filter((a) => a.peaking.status === s);
        return (
          <section key={s}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-display text-[16px] uppercase tracking-wide">{s}</h3>
              <span className="ml-auto num text-[13px] text-muted-foreground">{list.length}</span>
            </div>
            <AthleteRows
              list={list}
              meta={(a) => `${a.position} · ${a.peaking.assessedOn ? `assessed ${fmtDate(a.peaking.assessedOn)}` : "not assessed"}`}
              note={(a) => a.peaking.note}
              onOpen={(a) => openDrawer({ kind: "athlete", id: a.id, from: state })}
            />
          </section>
        );
      })}
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-[#b9793a]/40 bg-[#b9793a]/10 px-3 py-2.5 text-[12.5px] text-[#5e3c17]">{children}</div>;
}

function AthleteRows({ list, meta, note, onOpen }: { list: Athlete[]; meta: (a: Athlete) => string; note: (a: Athlete) => string | undefined; onOpen: (a: Athlete) => void }) {
  if (!list.length) return <Empty text="No athletes in this category." />;
  return (
    <ul className="divide-y divide-border/70 border-y border-border/70">
      {list.map((a) => (
        <li key={a.id}>
          <button onClick={() => onOpen(a)} className="w-full text-left py-2.5 px-1 hover:bg-background/70 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-[14px]">{a.name}</div>
              <div className="text-[12px] text-muted-foreground">{meta(a)}</div>
              {note(a) && <div className="text-[12.5px] mt-0.5">“{note(a)}”</div>}
            </div>
            <span className="text-[12px] text-[#2f5d46] font-semibold whitespace-nowrap mt-0.5">Details →</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function AthleteSupport({ a, back }: { a: Athlete; back?: () => void }) {
  const { fixtures: FIXTURES } = useSquad();
  const t = classify(a);
  const next = FIXTURES.find((f) => daysUntil(f.date) >= 0);
  return (
    <div className="space-y-5">
      {back && (
        <button onClick={back} className="text-[12.5px] text-[#2f5d46] font-semibold hover:underline">
          ← Back to list
        </button>
      )}
      <div>
        <div className="font-display text-[22px] uppercase leading-tight">{a.name}</div>
        <div className="text-[13px] text-muted-foreground">
          {a.position} · {groupOf(a)}
        </div>
      </div>

      <section className="rounded-md border border-border p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className={label11}>Recovery · rest required</div>
          <SourceTag kind="Coach assessment" />
        </div>
        <div className="flex items-center gap-2">
          <TrendPill tone={restTone(a.rest.status)} label={a.rest.status} />
          <span className="text-[13px]">{REST_LABEL[a.rest.status]}</span>
        </div>
        <div className="text-[12px] text-muted-foreground mt-1.5">{a.rest.assessedOn ? `Assessed ${fmtDate(a.rest.assessedOn)}` : "No assessment recorded"}</div>
        {a.rest.note && <div className="text-[13px] mt-1">“{a.rest.note}”</div>}
      </section>

      <section className="rounded-md border border-border p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className={label11}>Possible peaking</div>
          <SourceTag kind="Coach assessment" />
        </div>
        <TrendPill tone={peakTone(a.peaking.status)} label={a.peaking.status} />
        <div className="text-[12px] text-muted-foreground mt-1.5">{a.peaking.assessedOn ? `Assessed ${fmtDate(a.peaking.assessedOn)}` : "No assessment recorded"}</div>
        {a.peaking.note && <div className="text-[13px] mt-1">“{a.peaking.note}”</div>}
      </section>

      <section className="rounded-md border border-border p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className={label11}>Supporting test data</div>
          <SourceTag kind="Measured" />
        </div>
        {!a.tested ? (
          <div className="text-[13px] font-semibold uppercase">Insufficient data · not tested</div>
        ) : (
          <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-[13px]">
            <dt className="text-muted-foreground">Latest test</dt>
            <dd className="num">{fmtDate(a.lastTest)}</dd>
            <dt className="text-muted-foreground">Report status</dt>
            <dd>
              <StatusPill status={a.status} />
            </dd>
            <dt className="text-muted-foreground">VO₂max</dt>
            <dd className="num">{fmtNum(a.vo2)} ml/kg/min</dd>
            <dt className="text-muted-foreground">LT2</dt>
            <dd className="num">{a.lt2Pace ? `${fmtPace(a.lt2Pace)}/km · ${a.lt2Hr} bpm` : "—"}</dd>
            <dt className="text-muted-foreground">Change</dt>
            <dd className="num text-[12.5px]">{changeText(a)}</dd>
            <dt className="text-muted-foreground">Classification</dt>
            <dd>
              <TrendPill tone={trendTone(t)} label={t} />
            </dd>
          </dl>
        )}
        <p className="text-[11.5px] text-muted-foreground mt-2">Test data is context for the coach, not the basis of the status above.</p>
      </section>

      {next && (
        <section className="text-[13px]">
          <div className={label11 + " mb-1"}>Next competition</div>
          {fmtDate(next.date)} · {next.venue === "Home" ? "vs" : "@"} {next.opponent} · in {daysUntil(next.date)} days
        </section>
      )}
      <section className="text-[12px] text-muted-foreground">
        Future inputs (not in this prototype): wellness questionnaires, training load, session RPE, sleep, HRV trends, soreness and practitioner notes.
      </section>

      <Link href={`/athletes/${a.id}`} className="inline-block rounded-md bg-[#2f5d46] text-white px-3.5 py-2 text-[13px] font-semibold hover:bg-[#264d3a]">
        View passport →
      </Link>
    </div>
  );
}
