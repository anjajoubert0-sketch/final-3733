import { useState } from "react";
import { useCheckins, useRemoveCheckin, useSaveCheckin } from "../queries/training";
import { errorMessage } from "../lib/api";
import { TODAY, fmtDate, shiftIso } from "../lib/demo-data";
import { Card } from "./shell";
import { EmptyState, Loading, btn, inputCls, labelCls } from "./empty-states";
import { cn } from "@/lib/utils";

const DOMAINS = [
  { key: "sleep", label: "Sleep quality", hint: "1 poor · 5 great" },
  { key: "soreness", label: "Muscle soreness", hint: "1 very sore · 5 none" },
  { key: "fatigue", label: "Fatigue", hint: "1 exhausted · 5 fresh" },
  { key: "stress", label: "Stress", hint: "1 high · 5 low" },
] as const;
type Key = (typeof DOMAINS)[number]["key"];

const tone = (v: number) => (v <= 2 ? "bg-[#b3412b]/15 text-[#8f3320]" : v === 3 ? "bg-[#b9793a]/15 text-[#7a4c1c]" : "bg-[#2f5d46]/12 text-[#2f5d46]");

export function LatestCheckin({ athleteId }: { athleteId: string }) {
  const q = useCheckins(athleteId);
  if (q.isPending) return <Loading label="Loading" className="py-6" />;
  if (q.error) return <p className="text-[13px] text-muted-foreground">{errorMessage(q.error)}</p>;
  const c = q.data.rows[0];
  if (!c) return <p className="text-[13.5px] text-muted-foreground">Not recorded. No recovery check-ins yet.</p>;
  return (
    <div>
      <div className="text-[12px] text-muted-foreground mb-2">{fmtDate(c.date)}</div>
      <div className="grid grid-cols-2 gap-2">
        {DOMAINS.map((d) => (
          <div key={d.key} className={cn("rounded-md px-3 py-2 text-[13px] flex justify-between", tone(c[d.key]))}>
            <span>{d.label}</span>
            <strong className="num">{c[d.key]}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Daily recovery check-in (1–5 per domain) and 28-day history. Shared by coach passport and /me. */
export function WellnessLog({ athleteId }: { athleteId: string }) {
  const q = useCheckins(athleteId);
  const save = useSaveCheckin();
  const remove = useRemoveCheckin();
  const [f, setF] = useState<Record<Key, number>>({ sleep: 3, soreness: 3, fatigue: 3, stress: 3 });
  const [date, setDate] = useState(TODAY);
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (q.isPending) return <Loading label="Loading recovery" />;
  if (q.error) return <EmptyState title="Wellness not shared" body={errorMessage(q.error, "This athlete hasn't shared wellness and recovery data with your team.")} />;
  const { rows, canEdit } = q.data;
  const since = shiftIso(TODAY, -27);
  const recent = rows.filter((r) => r.date >= since);

  return (
    <div className="space-y-6">
      {canEdit && (
        <Card title="Recovery check-in">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setErr(null);
              save.mutate({ athleteId, date, ...f, notes: notes || null }, { onSuccess: () => setNotes(""), onError: (x) => setErr(errorMessage(x)) });
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DOMAINS.map((d) => (
                <div key={d.key}>
                  <div className="flex justify-between">
                    <span className={labelCls}>{d.label}</span>
                    <span className="text-[11px] text-muted-foreground">{d.hint}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        type="button"
                        key={v}
                        aria-pressed={f[d.key] === v}
                        onClick={() => setF({ ...f, [d.key]: v })}
                        className={cn("h-10 flex-1 rounded-md border text-[14px] font-semibold", f[d.key] === v ? "bg-[#2f5d46] text-white border-[#2f5d46]" : "border-border bg-card")}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-3 mt-4 items-end">
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" max={TODAY} value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Optional" />
              </div>
              <button disabled={save.isPending} className={btn()}>
                {save.isPending ? "Saving…" : "Save check-in"}
              </button>
            </div>
            {err && <div className="mt-2 text-[13px] text-[#8f3320]">{err}</div>}
            <p className="text-[11.5px] text-muted-foreground mt-3">Self-reported. Not a medical diagnosis. One check-in per day; saving again replaces that day.</p>
          </form>
        </Card>
      )}
      <Card title="Last 28 days" pad={false}>
        {recent.length === 0 ? (
          <p className="px-5 py-4 text-[13.5px] text-muted-foreground">Not recorded. No check-ins in the last 28 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px] min-w-[520px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-5 py-2 font-semibold">Date</th>
                  {DOMAINS.map((d) => (
                    <th key={d.key} className="py-2 font-semibold">
                      {d.label.split(" ")[0]}
                    </th>
                  ))}
                  <th className="py-2 font-semibold">Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-border/70">
                    <td className="px-5 py-2 num whitespace-nowrap">{fmtDate(r.date)}</td>
                    {DOMAINS.map((d) => (
                      <td key={d.key} className="py-2">
                        <span className={cn("inline-block rounded px-2 num font-semibold", tone(r[d.key]))}>{r[d.key]}</span>
                      </td>
                    ))}
                    <td className="py-2 text-muted-foreground max-w-[200px] truncate">{r.notes ?? "—"}</td>
                    <td className="py-2 pr-5 text-right">
                      {canEdit && (
                        <button onClick={() => remove.mutate({ checkinId: r.id })} className="text-[12px] text-[#8f3320] hover:underline">
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
