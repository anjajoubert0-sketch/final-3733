import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  PEAKING_STATUSES,
  POSITIONS,
  POSITION_GROUP,
  REST_LABEL,
  REST_STATUSES,
  age,
  changeText,
  classify,
  fmtDate,
  fmtNum,
  fmtPace,
  groupOf,
  isDueForRetest,
  peakTone,
  reportVisible,
  restTone,
  trendTone,
  type Athlete,
  type PeakingStatus,
  type Position,
  type PositionGroup,
  type RestStatus,
} from "../lib/demo-data";
import { Card, DemoTag, PageHeader, SourceTag, StatusPill, TrendPill } from "../components/shell";
import { useSquad } from "../hooks/use-squad";
import { useViewerRole } from "../hooks/use-viewer";
import { cn } from "@/lib/utils";

type ColKey = "position" | "group" | "age" | "vo2" | "lt1" | "lt2" | "sweat" | "lastTest" | "rest" | "peaking" | "change" | "status";
const COLS: { key: ColKey; label: string }[] = [
  { key: "position", label: "Position" },
  { key: "group", label: "Group" },
  { key: "age", label: "Age" },
  { key: "vo2", label: "VO₂max" },
  { key: "lt1", label: "LT1" },
  { key: "lt2", label: "LT2" },
  { key: "sweat", label: "Sweat rate" },
  { key: "lastTest", label: "Last test" },
  { key: "rest", label: "Rest required" },
  { key: "peaking", label: "Possible peaking" },
  { key: "change", label: "Change from previous" },
  { key: "status", label: "Report status" },
];
const DEFAULT_COLS: Record<ColKey, boolean> = {
  position: true,
  group: false,
  age: false,
  vo2: true,
  lt1: true,
  lt2: true,
  sweat: false,
  lastTest: true,
  rest: true,
  peaking: true,
  change: false,
  status: false,
};
const COLS_KEY = "vad-athlete-columns-v1";
const FILTERS_KEY = "vad-athlete-filters-v1";

type SortKey = "name" | "position" | "lastTest" | "vo2" | "lt2";
type Completion = "All" | "Tested" | "Not tested" | "Due for retest";

interface Filters {
  query: string;
  group: "All" | PositionGroup;
  position: "All" | Position;
  rest: "All" | RestStatus;
  peaking: "All" | PeakingStatus;
  completion: Completion;
  sortKey: SortKey;
  asc: boolean;
}
const DEFAULT_FILTERS: Filters = { query: "", group: "All", position: "All", rest: "All", peaking: "All", completion: "All", sortKey: "lastTest", asc: false };

function readJSON<T>(store: Storage | undefined, key: string, fallback: T): T {
  try {
    const raw = store?.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback;
  } catch {
    return fallback;
  }
}

function sortValue(a: Athlete, k: SortKey): string | number {
  switch (k) {
    case "name":
      return a.name;
    case "position":
      return POSITIONS.indexOf(a.position);
    case "lastTest":
      return a.lastTest ?? "";
    case "vo2":
      return a.vo2 ?? -1;
    case "lt2":
      return a.lt2Pace ?? 99999;
  }
}

const sel = "rounded-md border border-border bg-card px-3 py-2 text-[13.5px] min-w-0 w-full sm:w-auto";

export default function AthletesPage() {
  const role = useViewerRole();
  const { athletes: ATHLETES, team: TEAM } = useSquad();
  // Filters survive a trip to a passport and back (session only).
  const [f, setF] = useState<Filters>(() => readJSON(typeof window !== "undefined" ? sessionStorage : undefined, FILTERS_KEY, DEFAULT_FILTERS));
  const [visible, setVisible] = useState<Record<ColKey, boolean>>(() => readJSON(typeof window !== "undefined" ? localStorage : undefined, COLS_KEY, DEFAULT_COLS));
  const [showCols, setShowCols] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify(f));
    } catch {
      /* storage unavailable */
    }
  }, [f]);
  useEffect(() => {
    try {
      localStorage.setItem(COLS_KEY, JSON.stringify(visible));
    } catch {
      /* storage unavailable */
    }
  }, [visible]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((p) => ({ ...p, [k]: v }));
  const positionOptions = f.group === "All" ? POSITIONS : POSITIONS.filter((p) => POSITION_GROUP[p] === f.group);
  const active =
    f.query !== "" || f.group !== "All" || f.position !== "All" || f.rest !== "All" || f.peaking !== "All" || f.completion !== "All";

  const rows = useMemo(() => {
    let list = ATHLETES;
    if (f.query.trim()) {
      const q = f.query.trim().toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q));
    }
    if (f.group !== "All") list = list.filter((a) => groupOf(a) === f.group);
    if (f.position !== "All") list = list.filter((a) => a.position === f.position);
    if (f.rest !== "All") list = list.filter((a) => a.rest.status === f.rest);
    if (f.peaking !== "All") list = list.filter((a) => a.peaking.status === f.peaking);
    if (f.completion === "Tested") list = list.filter((a) => a.tested);
    if (f.completion === "Not tested") list = list.filter((a) => !a.tested);
    if (f.completion === "Due for retest") list = list.filter(isDueForRetest);
    return [...list].sort((a, b) => {
      const va = sortValue(a, f.sortKey);
      const vb = sortValue(b, f.sortKey);
      const r = va < vb ? -1 : va > vb ? 1 : 0;
      if (r === 0) return a.name < b.name ? -1 : 1;
      return f.asc ? r : -r;
    });
  }, [ATHLETES, f]);

  const toggleSort = (k: SortKey) => setF((p) => (p.sortKey === k ? { ...p, asc: !p.asc } : { ...p, sortKey: k, asc: k !== "lastTest" }));
  const toggleSel = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSel = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  // Coaches see measured values only from Published reports (the server strips the rest).
  const hidden = (a: Athlete) => role !== "Practitioner" && a.tested && !reportVisible(a);

  const exportCsv = () => {
    const src = selected.length ? rows.filter((r) => selected.includes(r.id)) : rows;
    const header = ["Athlete (fictional)", "Position", "Group", "Last test", "VO2max", "LT1 pace (s/km)", "LT2 pace (s/km)", "Rest required (coach)", "Possible peaking (coach)"];
    const lines = src.map((a) =>
      [
        a.name,
        a.position,
        groupOf(a),
        a.lastTest ?? "Not tested",
        hidden(a) ? "Pending release" : (a.vo2 ?? ""),
        hidden(a) ? "" : (a.lt1Pace ?? ""),
        hidden(a) ? "" : (a.lt2Pace ?? ""),
        a.rest.status,
        a.peaking.status,
      ].join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = "bigboys-rugby-demo-athletes.csv";
    el.click();
    URL.revokeObjectURL(url);
  };

  const sortable: Partial<Record<ColKey | "name", SortKey>> = { name: "name", position: "position", lastTest: "lastTest", vo2: "vo2", lt2: "lt2" };

  const Head = ({ k, label }: { k: ColKey | "name"; label: string }) => {
    const sk = sortable[k];
    const right = k === "vo2";
    if (!sk) return <th className={cn("px-3 py-2.5 font-semibold text-[11px] uppercase tracking-[0.12em] whitespace-nowrap", right && "text-right")}>{label}</th>;
    return (
      <th className={cn("px-3 py-2.5 font-semibold whitespace-nowrap", right && "text-right")} aria-sort={f.sortKey === sk ? (f.asc ? "ascending" : "descending") : "none"}>
        <button onClick={() => toggleSort(sk)} className="uppercase tracking-[0.12em] text-[11px] font-semibold hover:text-foreground inline-flex items-center gap-1">
          {label}
          <span className="text-[10px] opacity-60">{f.sortKey === sk ? (f.asc ? "▲" : "▼") : "↕"}</span>
        </button>
      </th>
    );
  };

  const measured = (a: Athlete, v: string) => (!a.tested ? <span className="text-muted-foreground">Not tested</span> : hidden(a) ? <span className="text-muted-foreground text-[12px] whitespace-nowrap">Pending release</span> : v);

  const cell = (a: Athlete, key: ColKey) => {
    switch (key) {
      case "position":
        return <span className="whitespace-nowrap">{a.position}</span>;
      case "group":
        return <span className="text-muted-foreground">{groupOf(a)}</span>;
      case "age":
        return <span className="num">{age(a.dob)}</span>;
      case "vo2":
        return <span className="num">{measured(a, fmtNum(a.vo2))}</span>;
      case "lt1":
        return <span className="num whitespace-nowrap">{measured(a, a.lt1Pace ? `${fmtPace(a.lt1Pace)}/km · ${a.lt1Hr} bpm` : "—")}</span>;
      case "lt2":
        return <span className="num whitespace-nowrap">{measured(a, a.lt2Pace ? `${fmtPace(a.lt2Pace)}/km · ${a.lt2Hr} bpm` : "—")}</span>;
      case "sweat":
        return <span className="num whitespace-nowrap">{measured(a, a.sweatRate !== undefined ? `${fmtNum(a.sweatRate)} L/h` : "Not tested")}</span>;
      case "lastTest":
        return <span className="num whitespace-nowrap">{a.tested ? fmtDate(a.lastTest) : <span className="text-muted-foreground">Not tested</span>}</span>;
      case "rest":
        return (
          <span title={REST_LABEL[a.rest.status]} className="inline-flex items-center whitespace-nowrap">
            <TrendPill tone={restTone(a.rest.status)} label={a.rest.status === "Grey" ? "Insufficient data" : a.rest.status} />
          </span>
        );
      case "peaking":
        return (
          <span title={a.peaking.status} className="whitespace-nowrap">
            <TrendPill tone={peakTone(a.peaking.status)} label={a.peaking.status.replace(" — coach assessed", "")} />
          </span>
        );
      case "change": {
        if (!a.tested) return <span className="text-muted-foreground">Not tested</span>;
        if (hidden(a)) return <span className="text-muted-foreground text-[12px]">Pending release</span>;
        const t = classify(a);
        return (
          <div className="space-y-1">
            <div className="text-[12.5px] num text-muted-foreground whitespace-nowrap">{changeText(a)}</div>
            <TrendPill tone={trendTone(t)} label={t} />
          </div>
        );
      }
      case "status":
        return <StatusPill status={a.status} />;
    }
  };

  const shown = COLS.filter((c) => visible[c.key]);

  return (
    <div>
      <PageHeader eyebrow={`${TEAM.name} · ${TEAM.season} · ${ATHLETES.length} athletes`} title="Team athletes">
        <button onClick={exportCsv} className="rounded-md border border-border bg-card px-3.5 py-2 text-[13px] font-semibold hover:bg-background">
          Export CSV {selected.length ? `(${selected.length} selected)` : `(${rows.length})`}
        </button>
        {role === "Practitioner" ? (
          <Link href="/practitioner/testing/entry" className="rounded-md bg-[#2f5d46] text-white px-3.5 py-2 text-[13px] font-semibold hover:bg-[#264d3a]">
            Enter test data
          </Link>
        ) : (
          <Link href="/book" className="rounded-md bg-[#2f5d46] text-white px-3.5 py-2 text-[13px] font-semibold hover:bg-[#264d3a]">
            Book Performance Testing
          </Link>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="rounded-[10px] border border-border bg-card p-4 mb-4 fade-up">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            aria-label="Search athletes"
            type="search"
            placeholder="Search athlete name"
            value={f.query}
            onChange={(e) => set("query", e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-[14px] w-full sm:w-[240px] outline-none focus:border-[#2f5d46]"
          />
          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            {(["All", "Forwards", "Backs"] as const).map((g) => (
              <button
                key={g}
                aria-pressed={f.group === g}
                onClick={() => setF((p) => ({ ...p, group: g, position: g !== "All" && p.position !== "All" && POSITION_GROUP[p.position] !== g ? "All" : p.position }))}
                className={cn("px-3 py-1.5 rounded text-[13px] font-medium", f.group === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {g}
              </button>
            ))}
          </div>
          <select aria-label="Position" value={f.position} onChange={(e) => set("position", e.target.value as Filters["position"])} className={sel}>
            <option value="All">All positions</option>
            {positionOptions.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select aria-label="Rest required" value={f.rest} onChange={(e) => set("rest", e.target.value as Filters["rest"])} className={sel}>
            <option value="All">Rest required: all</option>
            {REST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s} · {REST_LABEL[s]}
              </option>
            ))}
          </select>
          <select aria-label="Possible peaking" value={f.peaking} onChange={(e) => set("peaking", e.target.value as Filters["peaking"])} className={sel}>
            <option value="All">Peaking: all</option>
            {PEAKING_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select aria-label="Testing completion" value={f.completion} onChange={(e) => set("completion", e.target.value as Completion)} className={sel}>
            <option value="All">Testing: all</option>
            <option>Tested</option>
            <option>Not tested</option>
            <option>Due for retest</option>
          </select>
          <select
            aria-label="Sort by"
            value={`${f.sortKey}:${f.asc ? "asc" : "desc"}`}
            onChange={(e) => {
              const [k, d] = e.target.value.split(":");
              setF((p) => ({ ...p, sortKey: k as SortKey, asc: d === "asc" }));
            }}
            className={sel}
          >
            <option value="lastTest:desc">Last test: newest first</option>
            <option value="lastTest:asc">Last test: oldest first</option>
            <option value="name:asc">Name A–Z</option>
            <option value="position:asc">Position (1–15)</option>
            <option value="vo2:desc">VO₂max: high to low</option>
          </select>
          <div className="relative sm:ml-auto">
            <button onClick={() => setShowCols((v) => !v)} aria-expanded={showCols} className="rounded-md border border-border bg-background px-3 py-2 text-[13px] font-semibold">
              Columns ({shown.length})
            </button>
            {showCols && (
              <div className="absolute right-0 mt-2 z-20 w-[240px] rounded-md border border-border bg-card p-3 shadow-lg space-y-2">
                {COLS.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 text-[13px] cursor-pointer">
                    <input type="checkbox" aria-label={c.label} className="accent-[#2f5d46]" checked={visible[c.key]} onChange={() => setVisible((v) => ({ ...v, [c.key]: !v[c.key] }))} />
                    {c.label}
                  </label>
                ))}
                <button onClick={() => setVisible(DEFAULT_COLS)} className="pt-1 text-[12.5px] font-semibold text-[#2f5d46] hover:underline">
                  Reset columns
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[12.5px] text-muted-foreground">
          <span>
            Showing <strong className="text-foreground num">{rows.length}</strong> of {ATHLETES.length} athletes
          </span>
          {active && (
            <button onClick={() => setF({ ...DEFAULT_FILTERS, sortKey: f.sortKey, asc: f.asc })} className="font-semibold text-[#2f5d46] hover:underline">
              Clear filters
            </button>
          )}
          <span className="inline-flex items-center gap-1.5">
            <SourceTag kind="Measured" /> VO₂max, LT1, LT2
          </span>
          <span className="inline-flex items-center gap-1.5">
            <SourceTag kind="Coach assessment" /> Rest required, possible peaking
          </span>
        </div>
      </div>

      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead className="bg-background/70">
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="px-4 py-2.5 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSel}
                    onChange={() => setSelected(allSel ? selected.filter((id) => !rows.some((r) => r.id === id)) : [...new Set([...selected, ...rows.map((r) => r.id)])])}
                  />
                </th>
                <Head k="name" label="Athlete" />
                {shown.map((c) => (
                  <Head key={c.key} k={c.key} label={c.label} />
                ))}
                <th className="sticky right-0 z-[1] bg-[#f8f8f5] px-4 py-2.5 text-right font-semibold text-[11px] uppercase tracking-[0.12em] shadow-[-8px_0_12px_-10px_rgba(0,0,0,0.25)]">Passport</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="group border-t border-border/70 hover:bg-background/60">
                  <td className="px-4 py-2.5">
                    <input type="checkbox" aria-label={`Select ${a.name}`} checked={selected.includes(a.id)} onChange={() => toggleSel(a.id)} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Link href={`/athletes/${a.id}`} className="font-semibold hover:text-[#2f5d46] hover:underline">
                      {a.name}
                    </Link>
                    <div className="text-[12px] text-muted-foreground">
                      {groupOf(a)} · {a.heightCm} cm · {a.weightKg} kg
                    </div>
                  </td>
                  {shown.map((c) => (
                    <td key={c.key} className={cn("px-3 py-2.5", c.key === "vo2" && "text-right")}>
                      {cell(a, c.key)}
                    </td>
                  ))}
                  <td className="sticky right-0 bg-card group-hover:bg-[#f9f8f5] px-4 py-2.5 text-right whitespace-nowrap shadow-[-8px_0_12px_-10px_rgba(0,0,0,0.25)]">
                    <Link
                      href={`/athletes/${a.id}`}
                      className="inline-flex items-center rounded-md border border-[#2f5d46]/40 px-2.5 py-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#2f5d46] hover:bg-[#2f5d46] hover:text-white transition-colors"
                    >
                      View passport →
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={shown.length + 3} className="px-5 py-10 text-center text-muted-foreground">
                    No athletes match these filters.{" "}
                    <button onClick={() => setF(DEFAULT_FILTERS)} className="font-semibold text-[#2f5d46] hover:underline">
                      Clear filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[12.5px] text-muted-foreground">
        <DemoTag />
        <span>
          Not tested = no test on record. — = value not measured. Rest required and possible peaking are entered by coaching staff and are not derived from VO₂max or
          lactate.
          {role !== "Practitioner" && " Pending release = results not yet published by the practitioner (analysis and payment both complete)."}
        </span>
      </div>
    </div>
  );
}
