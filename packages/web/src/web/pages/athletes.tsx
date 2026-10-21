import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ATHLETES,
  EVENTS,
  GROUP_FILTERS,
  TEAM,
  changeText,
  classify,
  fmtDate,
  fmtNum,
  fmtPace,
  filterAthletes,
  isDueForRetest,
  trendTone,
  zones,
  type Athlete,
  type GroupFilter,
} from "../lib/demo-data";
import { Card, DemoTag, PageHeader, StatusPill, TrendPill } from "../components/shell";
import { useRole } from "../components/shell";

type ColKey = "sport" | "event" | "lastTest" | "lt1" | "lt2" | "vo2" | "sweat" | "zones" | "change" | "status";
const COLS: { key: ColKey; label: string }[] = [
  { key: "sport", label: "Primary sport" },
  { key: "event", label: "Event" },
  { key: "lastTest", label: "Last test" },
  { key: "lt1", label: "LT1 pace · HR" },
  { key: "lt2", label: "LT2 pace · HR" },
  { key: "vo2", label: "VO₂max" },
  { key: "sweat", label: "Sweat rate" },
  { key: "zones", label: "Training zones" },
  { key: "change", label: "Change from previous" },
  { key: "status", label: "Report status" },
];

type SortKey = "name" | "event" | "lastTest" | "vo2" | "lt2";

function sortValue(a: Athlete, k: SortKey): string | number {
  switch (k) {
    case "name":
      return a.name;
    case "event":
      return EVENTS.indexOf(a.event);
    case "lastTest":
      return a.lastTest ?? "";
    case "vo2":
      return a.vo2 ?? -1;
    case "lt2":
      return a.lt2Pace ?? 99999;
  }
}

export default function AthletesPage() {
  const { role } = useRole();
  const [group, setGroup] = useState<GroupFilter>("All events");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | "Not tested" | "Due">("All");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [asc, setAsc] = useState(true);
  const [visible, setVisible] = useState<Record<ColKey, boolean>>({
    sport: false,
    event: true,
    lastTest: true,
    lt1: false,
    lt2: true,
    vo2: true,
    sweat: false,
    zones: false,
    change: true,
    status: true,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [showCols, setShowCols] = useState(false);

  const rows = useMemo(() => {
    let list = filterAthletes(ATHLETES, group);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q) || a.event.toLowerCase().includes(q));
    }
    if (status === "Not tested") list = list.filter((a) => !a.tested);
    if (status === "Due") list = list.filter(isDueForRetest);
    return [...list].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      const r = va < vb ? -1 : va > vb ? 1 : 0;
      return asc ? r : -r;
    });
  }, [group, query, status, sortKey, asc]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setAsc(!asc);
    else {
      setSortKey(k);
      setAsc(true);
    }
  };
  const toggleSel = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSel = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  const exportCsv = () => {
    const header = ["Athlete (fictional)", "Event", "Last test", "LT2 pace (s/km)", "LT2 HR", "VO2max", "Report status"];
    const lines = rows.map((a) =>
      [a.name, a.event, a.lastTest ?? "Not tested", a.lt2Pace ?? "", a.lt2Hr ?? "", a.vo2 ?? "", a.status].join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = "vert-dirt-demo-athletes.csv";
    el.click();
    URL.revokeObjectURL(url);
  };

  const Th = ({ k, label, align }: { k: SortKey; label: string; align?: "right" }) => (
    <th className={`px-3 py-2.5 font-semibold ${align === "right" ? "text-right" : ""}`}>
      <button onClick={() => toggleSort(k)} className="uppercase tracking-[0.12em] text-[11px] hover:text-foreground inline-flex items-center gap-1">
        {label}
        <span className="text-[10px] opacity-60">{sortKey === k ? (asc ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );

  const cell = (a: Athlete, key: ColKey) => {
    if (key === "sport") return <span className="text-muted-foreground">Running</span>;
    if (key === "event") return <span className="text-muted-foreground">{a.event}</span>;
    if (key === "lastTest") return <span className="num whitespace-nowrap">{a.tested ? fmtDate(a.lastTest) : "Not tested"}</span>;
    if (key === "lt1")
      return <span className="num whitespace-nowrap">{!a.tested ? "Not tested" : a.lt1Pace ? `${fmtPace(a.lt1Pace)} · ${a.lt1Hr} bpm` : "—"}</span>;
    if (key === "lt2")
      return <span className="num whitespace-nowrap">{!a.tested ? "Not tested" : a.lt2Pace ? `${fmtPace(a.lt2Pace)} · ${a.lt2Hr} bpm` : "—"}</span>;
    if (key === "vo2") return <span className="num">{a.tested ? fmtNum(a.vo2) : "Not tested"}</span>;
    if (key === "sweat") return <span className="num">{a.sweatRate !== undefined ? `${fmtNum(a.sweatRate)} L/h` : "—"}</span>;
    if (key === "zones") return <span className="num">{zones(a).length ? `${zones(a).length} zones` : a.tested ? "—" : "Not tested"}</span>;
    if (key === "change") return <span className="text-[12.5px] num text-muted-foreground">{a.tested ? changeText(a) : "Not tested"}</span>;
    if (key === "status") return <StatusPill status={a.status} />;
    return null;
  };

  return (
    <div>
      <PageHeader eyebrow={`${TEAM.name} · ${TEAM.season}`} title="Team athletes">
        <button
          onClick={exportCsv}
          className="rounded-md border border-border bg-card px-3.5 py-2 text-[13px] font-semibold hover:bg-background"
        >
          Export CSV {selected.length ? `(${selected.length} selected)` : `(${rows.length})`}
        </button>
        {role === "Practitioner" && (
          <Link href="/practitioner/test-entry" className="rounded-md bg-[#2f5d46] text-white px-3.5 py-2 text-[13px] font-semibold hover:bg-[#264d3a]">
            Enter test data
          </Link>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4 fade-up">
        <input
          aria-label="Search athletes" type="search"
          placeholder="Search athlete or event"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-[14px] w-[260px] outline-none focus:border-[#2f5d46]"
        />
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
        <div className="inline-flex rounded-md border border-border bg-card p-0.5">
          {(["All", "Not tested", "Due"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded text-[13px] ${status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <button onClick={() => setShowCols((v) => !v)} className="rounded-md border border-border bg-card px-3 py-2 text-[13px] font-semibold">
            Columns
          </button>
          {showCols && (
            <div className="absolute right-0 mt-2 z-20 w-[230px] rounded-md border border-border bg-card p-3 shadow-lg space-y-2">
              {COLS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" aria-label={c.label} checked={visible[c.key]} onChange={() => setVisible((v) => ({ ...v, [c.key]: !v[c.key] }))} />
                  {c.label}
                </label>
              ))}
            </div>
          )}
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
                <Th k="name" label="Athlete" />
                {COLS.filter((c) => visible[c.key]).map((c) => (
                  <th key={c.key} className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-[0.12em] whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right font-semibold text-[11px] uppercase tracking-[0.12em]">Passport</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const t = classify(a);
                return (
                  <tr key={a.id} className="border-t border-border/70 hover:bg-background/60">
                    <td className="px-4 py-2.5">
                      <input type="checkbox" aria-label={`Select ${a.name}`} checked={selected.includes(a.id)} onChange={() => toggleSel(a.id)} />
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/athletes/${a.id}`} className="font-semibold hover:text-[#2f5d46] hover:underline">
                        {a.name}
                      </Link>
                      <div className="text-[12px] text-muted-foreground">
                        {a.sex === "F" ? "Female" : "Male"} · {a.experience} experience
                      </div>
                    </td>
                    {COLS.filter((c) => visible[c.key]).map((c) => (
                      <td key={c.key} className="px-3 py-2.5">
                        {c.key === "change" ? (
                          <div className="space-y-1">
                            {cell(a, c.key)}
                            {a.tested && <TrendPill tone={trendTone(t)} label={t} />}
                          </div>
                        ) : (
                          cell(a, c.key)
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/athletes/${a.id}`} className="text-[13px] font-semibold text-[#2f5d46] hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-5 py-10 text-center text-muted-foreground">
                    No athletes match these filters.
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
          Not tested = no test on record. — = measured value unavailable. Pace is shown only within the same event group; running is the only modality in this demo team.
        </span>
      </div>
    </div>
  );
}
