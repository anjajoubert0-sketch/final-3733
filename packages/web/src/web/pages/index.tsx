import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ATHLETES,
  EVENT_GROUP,
  GROUP_FILTERS,
  TEAM,
  aggText,
  changeText,
  classify,
  daysSince,
  fmtDate,
  fmtNum,
  fmtPace,
  filterAthletes,
  getAthlete,
  isDueForRetest,
  paceText,
  teamStats,
  trendTone,
  type GroupFilter,
} from "../lib/demo-data";
import { Card, DemoTag, StatusPill, SummaryCard, TrendPill } from "../components/shell";
import { Donut, HBars, Histogram } from "../components/charts";


const groupColor = (event: string) => (EVENT_GROUP[event as keyof typeof EVENT_GROUP] === "Middle distance (800–1500 m)" ? "#2f5d46" : "#b9793a");

function Index() {
  const [filter, setFilter] = useState<GroupFilter>("All events");
  const [previewId, setPreviewId] = useState("a01");
  const list = useMemo(() => filterAthletes(ATHLETES, filter), [filter]);
  const s = teamStats(list);
  const preview = getAthlete(previewId) ?? ATHLETES[0];
  const dueList = list.filter(isDueForRetest);
  const notTested = list.filter((a) => !a.tested);
  const nextIn = daysSince(TEAM.nextTestingDate) * -1;

  return (
    <div>
      {/* Team identity band */}
      <section className="topo rounded-[12px] text-[#f5f4ef] p-6 lg:p-8 mb-6 fade-up relative overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-lg bg-[#2f5d46] grid place-items-center font-display text-[26px] text-white shrink-0">{TEAM.logoText}</div>
            <div>
              <div className="font-display text-[12px] uppercase tracking-[0.2em] text-[#c9d8c4]">Team performance dashboard</div>
              <h1 className="font-display text-[44px] leading-none uppercase mt-1">{TEAM.name}</h1>
              <div className="mt-2 text-[14px] text-[#c9cdc5]">
                {TEAM.sport} · Head coach {TEAM.headCoach} · Season {TEAM.season}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
            <div>
              <div className="uppercase tracking-[0.14em] text-[11px] text-[#9fb3a4]">Last testing date</div>
              <div className="font-display text-[20px] num">{fmtDate(TEAM.lastTestingDate)}</div>
            </div>
            <div>
              <div className="uppercase tracking-[0.14em] text-[11px] text-[#9fb3a4]">Next scheduled testing</div>
              <div className="font-display text-[20px] num">
                {fmtDate(TEAM.nextTestingDate)} <span className="text-[13px] text-[#c9d8c4] font-sans">in {nextIn} days</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="text-[12px] uppercase tracking-[0.14em] text-[#9fb3a4]" htmlFor="grp">
            Filter by event group
          </label>
          <select
            id="grp"
            value={filter}
            onChange={(e) => setFilter(e.target.value as GroupFilter)}
            className="rounded-md bg-[#0f1411]/60 border border-[#2f5d46] px-3 py-1.5 text-[14px] text-white"
          >
            {GROUP_FILTERS.map((g) => (
              <option key={g} value={g} className="text-black">
                {g}
              </option>
            ))}
          </select>
          <span className="text-[12px] text-[#9fb3a4]">
            Team averages are shown only where at least 5 comparable athletes have data. Paces are never averaged across events.
          </span>
        </div>
      </section>

      {/* Summary cards */}
      <div className="stagger grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total athletes" value={String(s.total)} sub={`${list.length} in view`} />
        <SummaryCard label="Athletes tested" value={String(s.tested)} sub={`${s.notTested} not tested yet`} accent="#2f5d46" />
        <div className="rounded-[10px] border border-border bg-card p-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Testing completion</div>
            <div className="mt-2 font-display text-[42px] leading-none num">{s.completion}%</div>
            <div className="mt-2 text-[12.5px] text-muted-foreground">
              {s.tested} of {s.total} athletes
            </div>
          </div>
          <Donut value={s.completion} />
        </div>
        <SummaryCard
          label="Average VO₂max"
          value={s.vo2 !== undefined ? s.vo2.toFixed(1) : "—"}
          unit="ml/kg/min"
          sub={s.vo2 !== undefined ? `n = ${s.vo2N} · running-comparable` : aggText(undefined, s.vo2N)}
          accent="#b9793a"
        />
        <SummaryCard
          label="Average aerobic threshold"
          value={s.lt1Hr !== undefined ? String(Math.round(s.lt1Hr)) : "—"}
          unit="bpm (LT1 HR)"
          sub={s.lt1Hr !== undefined ? "Pace by event group, see analytics" : aggText(undefined, s.tested)}
          accent="#7c8f86"
        />
        <SummaryCard
          label="Average anaerobic threshold"
          value={s.lt2Hr !== undefined ? String(Math.round(s.lt2Hr)) : "—"}
          unit="bpm (LT2 HR)"
          sub={s.lt2Hr !== undefined ? "Pace by event group, see analytics" : aggText(undefined, s.tested)}
          accent="#b3412b"
        />
        <SummaryCard label="Athletes due for retesting" value={String(s.due)} sub="Last test older than 120 days" accent="#b9793a" />
        <SummaryCard label="Not tested" value={String(s.notTested)} sub='Shown as "Not tested" in tables' accent="#6b716c" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
        {/* Team table preview */}
        <Card
          title="Team performance"
          pad={false}
          right={
            <Link href="/athletes" className="text-[13px] text-[#2f5d46] font-semibold hover:underline">
              Open full athlete table →
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-5 py-2.5 font-semibold">Athlete</th>
                  <th className="px-3 py-2.5 font-semibold">Event</th>
                  <th className="px-3 py-2.5 font-semibold">LT2 pace · HR</th>
                  <th className="px-3 py-2.5 font-semibold text-right">VO₂max</th>
                  <th className="px-3 py-2.5 font-semibold">Trend</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Passport</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => {
                  const t = classify(a);
                  return (
                    <tr key={a.id} className="border-t border-border/70 hover:bg-background/60">
                      <td className="px-5 py-2.5">
                        <Link href={`/athletes/${a.id}`} className="font-semibold text-foreground hover:text-[#2f5d46] hover:underline">
                          {a.name}
                        </Link>
                        {!a.tested && <div className="text-[12px] text-muted-foreground">Not tested</div>}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{a.event}</td>
                      <td className="px-3 py-2.5 num whitespace-nowrap">{paceText(a, "lt2")}</td>
                      <td className="px-3 py-2.5 num text-right">{a.tested ? fmtNum(a.vo2) : "—"}</td>
                      <td className="px-3 py-2.5">
                        <TrendPill tone={trendTone(t)} label={t} />
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <Link href={`/athletes/${a.id}`} className="text-[13px] text-[#2f5d46] hover:underline">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="VO₂max by athlete" right={<DemoTag />}>
            <HBars
              max={80}
              unit=""
              items={[...list]
                .filter((a) => a.vo2 !== undefined)
                .sort((a, b) => (b.vo2 ?? 0) - (a.vo2 ?? 0))
                .map((a) => ({ label: a.name, value: a.vo2, color: groupColor(a.event) }))}
            />
            <div className="mt-4 flex gap-4 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-sm bg-[#2f5d46]" /> Middle distance
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-sm bg-[#b9793a]" /> Distance
              </span>
            </div>
          </Card>

          <Card title="Retest queue" right={<span className="text-[12px] text-muted-foreground num">{dueList.length} due</span>}>
            {dueList.length === 0 && <div className="text-[13px] text-muted-foreground">No athletes due in this view.</div>}
            <ul className="divide-y divide-border/70">
              {dueList.map((a) => (
                <li key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <Link href={`/athletes/${a.id}`} className="font-semibold text-[14px] hover:underline">
                      {a.name}
                    </Link>
                    <div className="text-[12px] text-muted-foreground">
                      {a.event} · last test {fmtDate(a.lastTest)}
                    </div>
                  </div>
                  <TrendPill tone="ochre" label="Due" />
                </li>
              ))}
              {notTested.map((a) => (
                <li key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[14px]">{a.name}</div>
                    <div className="text-[12px] text-muted-foreground">{a.event} · no baseline</div>
                  </div>
                  <TrendPill tone="stone" label="Not tested" />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Passport preview + distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-6 mt-6">
        <Card title="Athlete passport preview" right={<StatusPill status={preview.status} />}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <select
              aria-label="Choose athlete"
              value={previewId}
              onChange={(e) => setPreviewId(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-[14px]"
            >
              {ATHLETES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.event}
                </option>
              ))}
            </select>
            <Link href={`/athletes/${preview.id}`} className="text-[13px] text-[#2f5d46] font-semibold hover:underline whitespace-nowrap">
              Open passport →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-border/70 pt-4">
            <Mini label="LT1" value={preview.tested && preview.lt1Pace ? `${fmtPace(preview.lt1Pace)}/km` : preview.tested ? "—" : "Not tested"} sub={preview.lt1Hr ? `${preview.lt1Hr} bpm` : undefined} />
            <Mini label="LT2" value={preview.tested && preview.lt2Pace ? `${fmtPace(preview.lt2Pace)}/km` : preview.tested ? "—" : "Not tested"} sub={preview.lt2Hr ? `${preview.lt2Hr} bpm` : undefined} />
            <Mini label="VO₂max" value={fmtNum(preview.vo2)} sub={preview.vo2 ? "ml/kg/min" : undefined} />
          </div>
          <div className="mt-4 text-[13px] text-muted-foreground">
            {preview.tested ? `Latest change: ${changeText(preview)}` : "No testing history yet."}
          </div>
          <div className="mt-2 text-[12px] text-muted-foreground">
            Passport shows only measured values. {preview.sweatRate === undefined ? "No sweat test on record." : ""}
          </div>
        </Card>

        <Card title="VO₂max distribution (team)" right={<DemoTag />}>
          <Histogram
            values={list.filter((a) => a.vo2 !== undefined).map((a) => a.vo2!)}
            bins={6}
            lo={62}
            hi={76}
            color="#2f5d46"
            unit="VO₂max ml/kg/min"
            label="VO2max"
          />
          <p className="mt-3 text-[12.5px] text-muted-foreground">
            {s.vo2N >= 5
              ? "Distribution across athletes with a valid running VO₂max in this view."
              : `Only ${s.vo2N} athlete(s) in this view: distribution suppressed to protect identity (n<5).`}
          </p>
        </Card>
      </div>
    </div>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">{label}</div>
      <div className="font-display text-[24px] leading-tight num mt-1">{value}</div>
      {sub && <div className="text-[12px] text-muted-foreground num">{sub}</div>}
    </div>
  );
}

export default Index;
