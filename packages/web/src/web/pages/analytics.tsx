import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ATHLETES,
  DEFAULT_THRESHOLDS,
  EVENTS,
  EVENT_GROUP,
  GROUP_FILTERS,
  MIN_GROUP_N,
  TEAM,
  aggText,
  classify,
  fmtDate,
  fmtPace,
  filterAthletes,
  isDueForRetest,
  teamStats,
  trendTone,
  type ChangeThresholds,
  type GroupFilter,
  type Trend,
} from "../lib/demo-data";
import { Card, DemoTag, PageHeader, SummaryCard, TrendPill } from "../components/shell";
import { Histogram } from "../components/charts";

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : undefined);

export default function AnalyticsPage() {
  const [group, setGroup] = useState<GroupFilter>("All events");
  const [thr, setThr] = useState<ChangeThresholds>(DEFAULT_THRESHOLDS);
  const list = useMemo(() => filterAthletes(ATHLETES, group), [group]);
  const s = teamStats(list);

  // Team development: athletes with a previous and latest value on the same protocol
  const pairs = list.filter((a) => a.tested && a.vo2Prev !== undefined && a.vo2 !== undefined);
  const lt2Pairs = list.filter((a) => a.tested && a.lt2PacePrev !== undefined && a.lt2Pace !== undefined);
  const vo2Change = avg(pairs.map((a) => a.vo2! - a.vo2Prev!));
  const lt2Change = avg(lt2Pairs.map((a) => a.lt2Pace! - a.lt2PacePrev!));
  const counts: Record<Trend, number> = { Improving: 0, Stable: 0, "Requires investigation": 0, Mixed: 0, "No comparison": 0 };
  list.forEach((a) => counts[classify(a, thr)]++);
  const comparable = list.length - counts["No comparison"];

  const byTrend = (t: Trend) => list.filter((a) => classify(a, thr) === t);

  const eventRows = EVENTS.map((ev) => {
    const xs = ATHLETES.filter((a) => a.event === ev && a.tested);
    const all = ATHLETES.filter((a) => a.event === ev);
    return {
      ev,
      group: EVENT_GROUP[ev],
      n: all.length,
      tested: xs.length,
      vo2: xs.length >= MIN_GROUP_N ? avg(xs.filter((a) => a.vo2).map((a) => a.vo2!)) : undefined,
      lt2: xs.length >= MIN_GROUP_N ? avg(xs.filter((a) => a.lt2Pace).map((a) => a.lt2Pace!)) : undefined,
      vo2n: xs.filter((a) => a.vo2).length,
    };
  });

  return (
    <div>
      <PageHeader eyebrow={`${TEAM.name} · analytics`} title="Team analytics">
        <select
          aria-label="Event group"
          value={group}
          onChange={(e) => setGroup(e.target.value as GroupFilter)}
          className="rounded-md border border-border bg-card px-3 py-2 text-[14px]"
        >
          {GROUP_FILTERS.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </PageHeader>

      <div className="rounded-[10px] border border-border bg-card p-4 mb-6 text-[13px] text-muted-foreground leading-relaxed">
        Group averages are shown only when at least <strong className="text-foreground">{MIN_GROUP_N}</strong> comparable athletes have data
        (current n = {s.vo2N} for VO₂max). Paces are compared only within the same event. Running VO₂max, LT1 and LT2 are not combined with
        other protocols.
      </div>

      {/* A. Physiological overview */}
      <h2 className="font-display text-[20px] uppercase tracking-[0.06em] mb-3">A. Physiological overview</h2>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="VO₂max" value={s.vo2 !== undefined ? s.vo2.toFixed(1) : "—"} unit="ml/kg/min" sub={aggText(undefined, s.vo2N)} accent="#b9793a" />
        <SummaryCard label="LT1 heart rate" value={s.lt1Hr !== undefined ? String(Math.round(s.lt1Hr)) : "—"} unit="bpm" sub={aggText(undefined, s.tested)} accent="#7c8f86" />
        <SummaryCard label="LT2 heart rate" value={s.lt2Hr !== undefined ? String(Math.round(s.lt2Hr)) : "—"} unit="bpm" sub={aggText(undefined, s.tested)} accent="#b3412b" />
        <SummaryCard
          label="Sweat rate"
          value={list.filter((a) => a.sweatRate).length >= MIN_GROUP_N ? "Shown" : "Suppressed"}
          sub={`n = ${list.filter((a) => a.sweatRate).length} with sweat tests`}
          accent="#2f5d46"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <Card title="VO₂max distribution" right={<DemoTag />}>
          {list.filter((a) => a.vo2).length >= MIN_GROUP_N ? (
            <Histogram values={list.filter((a) => a.vo2).map((a) => a.vo2!)} bins={6} lo={62} hi={76} color="#2f5d46" unit="ml/kg/min" label="VO2max" />
          ) : (
            <Suppressed n={list.filter((a) => a.vo2).length} />
          )}
        </Card>
        <Card title="LT2 pace distribution (within group)" right={<DemoTag />}>
          {list.filter((a) => a.lt2Pace).length >= MIN_GROUP_N ? (
            <Histogram
              values={list.filter((a) => a.lt2Pace).map((a) => a.lt2Pace!)}
              bins={6}
              lo={195}
              hi={265}
              color="#b3412b"
              unit="s/km"
              label="LT2 pace"
            />
          ) : (
            <Suppressed n={list.filter((a) => a.lt2Pace).length} />
          )}
          <p className="mt-2 text-[12px] text-muted-foreground">Seconds per km. Mixes 800 m to 10,000 m athletes when "All events" is selected. Use an event group for comparison.</p>
        </Card>
        <Card title="Sweat rate" right={<DemoTag />}>
          <Suppressed n={list.filter((a) => a.sweatRate).length} what="sweat rate" />
          <p className="mt-2 text-[12px] text-muted-foreground">Sweat testing is run on a subset of athletes; no distribution is drawn below n = {MIN_GROUP_N}.</p>
        </Card>
      </div>

      {/* B. Event grouping */}
      <h2 className="font-display text-[20px] uppercase tracking-[0.06em] mb-3">B. Event grouping</h2>
      <Card pad={false} className="mb-6" right={<DemoTag />}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground border-b border-border">
                <th className="px-5 py-2.5 font-semibold">Event</th>
                <th className="px-3 py-2.5 font-semibold">Group</th>
                <th className="px-3 py-2.5 font-semibold text-right">Athletes</th>
                <th className="px-3 py-2.5 font-semibold text-right">Tested</th>
                <th className="px-3 py-2.5 font-semibold text-right">Avg VO₂max</th>
                <th className="px-5 py-2.5 font-semibold text-right">Avg LT2 pace</th>
              </tr>
            </thead>
            <tbody>
              {eventRows.map((r) => (
                <tr key={r.ev} className="border-t border-border/70">
                  <td className="px-5 py-2.5 font-semibold">{r.ev}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.group}</td>
                  <td className="px-3 py-2.5 num text-right">{r.n}</td>
                  <td className="px-3 py-2.5 num text-right">{r.tested}</td>
                  <td className="px-3 py-2.5 num text-right">{r.vo2 !== undefined ? `${r.vo2.toFixed(1)}` : aggText(undefined, r.tested)}</td>
                  <td className="px-5 py-2.5 num text-right">{r.lt2 !== undefined ? `${fmtPace(r.lt2)} /km` : aggText(undefined, r.tested)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 text-[12px] text-muted-foreground border-t border-border/70">
          Each event has fewer than {MIN_GROUP_N} athletes in this demo, so event averages are suppressed. Increase the squad or choose a group for comparison.
        </div>
      </Card>

      {/* C. Team development */}
      <h2 className="font-display text-[20px] uppercase tracking-[0.06em] mb-3">C. Team development</h2>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6 mb-6">
        <Card title="Period comparison: previous vs latest test" right={<DemoTag />}>
          <p className="text-[12.5px] text-muted-foreground mb-4">
            Demo compares each athlete's previous and latest test. Real periods (e.g. January vs April) will need the same protocol on both dates.
          </p>
          <dl className="grid grid-cols-2 gap-4 text-[13.5px]">
            <Metric label="Avg change in VO₂max" value={vo2Change !== undefined && pairs.length >= MIN_GROUP_N ? `${vo2Change >= 0 ? "+" : "−"}${Math.abs(vo2Change).toFixed(1)} ml/kg/min` : aggText(undefined, pairs.length)} n={pairs.length} />
            <Metric
              label="Avg change in LT2 pace"
              value={lt2Change !== undefined && lt2Pairs.length >= MIN_GROUP_N ? `${lt2Change >= 0 ? "+" : "−"}${Math.abs(Math.round(lt2Change))} s/km` : aggText(undefined, lt2Pairs.length)}
              n={lt2Pairs.length}
            />
            <Metric label="Avg change in threshold power" value="Not measured" n={0} />
            <Metric label="Comparable athletes" value={String(comparable)} n={list.length} />
          </dl>
        </Card>

        <Card title="Change classification" right={<span className="text-[12px] text-muted-foreground">n = {comparable} comparable</span>}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Count label="Improving" value={counts.Improving} />
            <Count label="Stable" value={counts.Stable} />
            <Count label="Decline" value={counts["Requires investigation"]} />
            <Count label="Mixed" value={counts.Mixed} tone="ochre" />
          </div>
          <div className="rounded-md border border-border p-4 space-y-3">
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Practitioner thresholds for meaningful change</div>
            <Threshold
              label="VO₂max change (ml/kg/min)"
              value={thr.vo2}
              step={0.1}
              onChange={(v) => setThr({ ...thr, vo2: v })}
            />
            <Threshold label="LT2 pace change (s/km)" value={thr.lt2} step={1} onChange={(v) => setThr({ ...thr, lt2: v })} />
            <p className="text-[12px] text-muted-foreground">
              Defaults are ±1.0 ml/kg/min and ±3 s/km. Changes inside the threshold count as stable. Thresholds are practitioner-set; this is demo wording.
            </p>
          </div>
        </Card>
      </div>

      {/* D. Athlete development */}
      <h2 className="font-display text-[20px] uppercase tracking-[0.06em] mb-3">D. Athlete development</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <DevList title="Positive trend" items={byTrend("Improving")} />
        <DevList title="Limited change" items={byTrend("Stable")} />
        <DevList title="Requires investigation" items={byTrend("Requires investigation")} />
        <DevList title="Due for retesting" items={list.filter(isDueForRetest)} dueList />
      </div>
      <p className="mt-4 text-[12.5px] text-muted-foreground">
        Mixed and no-comparison athletes are not listed above: {counts.Mixed} mixed, {counts["No comparison"]} without a comparable prior test.
        Classifications here are demo output from the thresholds above and require practitioner approval before use.
      </p>
    </div>
  );
}

function Suppressed({ n, what = "this metric" }: { n: number; what?: string }) {
  return (
    <div className="rounded-md bg-background p-6 text-center">
      <div className="font-display text-[18px] uppercase">Suppressed</div>
      <p className="text-[13px] text-muted-foreground mt-1">
        Only {n} athlete(s) with {what} in this view. Distribution hidden below n = {MIN_GROUP_N} to protect identity.
      </p>
    </div>
  );
}

function Metric({ label, value, n }: { label: string; value: string; n: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">{label}</dt>
      <dd className="mt-1 font-display text-[22px] num leading-tight">{value}</dd>
      <dd className="text-[12px] text-muted-foreground mt-1">n = {n}</dd>
    </div>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone: "accent" | "clay" | "ochre" | "stone" }) {
  const color = { accent: "#2f5d46", clay: "#b3412b", ochre: "#b9793a", stone: "#6b716c" }[tone];
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">{label}</div>
      <div className="font-display text-[34px] leading-none num mt-1" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function Threshold({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-[13.5px]">
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="w-24 rounded-md border border-border bg-background px-2 py-1 text-right num"
      />
    </label>
  );
}

function DevList({
  title,
  items,
  dueList,
}: {
  title: string;
  items: (typeof ATHLETES)[number][];
  dueList?: boolean;
}) {
  return (
    <Card
      title={title}
      right={<span className="text-[12px] text-muted-foreground num">n = {items.length}</span>}
    >
      {items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">None in this view.</p>
      ) : items.length < MIN_GROUP_N && !dueList ? (
        <p className="text-[13px] text-muted-foreground">
          Names hidden: fewer than {MIN_GROUP_N} athletes in this category. Count shown only.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/athletes/${a.id}`} className="text-[13.5px] font-semibold hover:underline truncate block">
                  {a.name}
                </Link>
                <div className="text-[12px] text-muted-foreground">
                  {a.event} · {dueList ? `last test ${fmtDate(a.lastTest)}` : a.lt2Pace ? `LT2 ${fmtPace(a.lt2Pace)}` : "—"}
                </div>
              </div>
              <TrendPill tone={dueList ? "ochre" : trendTone(classify(a))} label={dueList ? "Due" : classify(a)} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
