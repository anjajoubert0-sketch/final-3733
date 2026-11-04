import { useState } from "react";
import { useCreateSession, useRemoveSession, useSessions } from "../queries/training";
import { errorMessage } from "../lib/api";
import { TODAY, fmtDate } from "../lib/demo-data";
import { Card, SourceTag } from "./shell";
import { EmptyState, Loading, btn, inputCls, labelCls } from "./empty-states";

const TYPES = ["Run", "Conditioning", "Gym / strength", "Team training", "Match", "Cycle", "Swim", "Mobility / recovery", "Other"];

function weekLoad(rows: { date: string; durationMin: number; rpe: number }[]) {
  const day = (iso: string) => Math.floor(new Date(iso + "T00:00:00").getTime() / 86400000);
  const t = day(TODAY);
  const sum = (from: number, to: number) => rows.filter((r) => day(r.date) > t - to && day(r.date) <= t - from).reduce((s, r) => s + r.durationMin * r.rpe, 0);
  const n7 = rows.filter((r) => day(r.date) > t - 7).length;
  const n28 = rows.filter((r) => day(r.date) > t - 28).length;
  return { week: sum(0, 7), avg4: n28 ? Math.round(sum(0, 28) / 4) : undefined, n7, n28 };
}

export function LoadSummary({ athleteId }: { athleteId: string }) {
  const q = useSessions(athleteId);
  if (q.isPending) return <Loading label="Loading load" className="py-6" />;
  if (q.error) return <p className="text-[13px] text-muted-foreground">{errorMessage(q.error, "Training data not shared.")}</p>;
  const l = weekLoad(q.data.rows);
  if (!l.n28) return <p className="text-[13.5px] text-muted-foreground">Not enough data. No sessions logged in the last 4 weeks.</p>;
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className={labelCls}>This week · sRPE load</div>
        <div className="font-display text-[34px] leading-none num">{l.week}</div>
        <div className="text-[12px] text-muted-foreground mt-1">n = {l.n7} sessions</div>
      </div>
      <div>
        <div className={labelCls}>4-week weekly average</div>
        <div className="font-display text-[34px] leading-none num">{l.avg4 ?? "—"}</div>
        <div className="text-[12px] text-muted-foreground mt-1">n = {l.n28} sessions</div>
      </div>
    </div>
  );
}

/** Training sessions for one athlete. Same component on the coach passport and the individual pages. */
export function TrainingLog({ athleteId, showConnect }: { athleteId: string; showConnect?: boolean }) {
  const q = useSessions(athleteId);
  const create = useCreateSession();
  const remove = useRemoveSession();
  const [f, setF] = useState({ date: TODAY, type: "Run", durationMin: "45", rpe: "6", notes: "" });
  const [err, setErr] = useState<string | null>(null);

  if (q.isPending) return <Loading label="Loading training" />;
  if (q.error) return <EmptyState title="Training not shared" body={errorMessage(q.error, "This athlete hasn't shared training data with your team.")} />;
  const { rows, canEdit } = q.data;
  const l = weekLoad(rows);

  return (
    <div className="space-y-6">
      <Card title="Training load" right={<SourceTag kind="Calculated" />}>
        {l.n28 ? (
          <div className="flex flex-wrap gap-8 text-[13px]">
            <div>
              <span className="text-muted-foreground">This week sRPE load: </span>
              <strong className="num">{l.week}</strong> <span className="text-muted-foreground">(n={l.n7})</span>
            </div>
            <div>
              <span className="text-muted-foreground">4-week weekly average: </span>
              <strong className="num">{l.avg4}</strong> <span className="text-muted-foreground">(n={l.n28})</span>
            </div>
          </div>
        ) : (
          <p className="text-[13.5px] text-muted-foreground">Not enough data. No sessions in the last 4 weeks.</p>
        )}
        <p className="text-[11.5px] text-muted-foreground mt-2">sRPE load = duration (min) × session RPE (1–10).</p>
      </Card>

      {canEdit && (
        <Card title="Add session">
          <form
            className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setErr(null);
              create.mutate(
                { athleteId, date: f.date, type: f.type, durationMin: Number(f.durationMin), rpe: Number(f.rpe), notes: f.notes || null },
                { onSuccess: () => setF({ ...f, notes: "" }), onError: (x) => setErr(errorMessage(x)) },
              );
            }}
          >
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" max={TODAY} required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={inputCls}>
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Minutes</label>
              <input type="number" min={1} max={600} required value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>RPE (1–10)</label>
              <input type="number" min={1} max={10} required value={f.rpe} onChange={(e) => setF({ ...f, rpe: e.target.value })} className={inputCls} />
            </div>
            <button disabled={create.isPending} className={btn("primary", "col-span-2 md:col-span-1")}>
              {create.isPending ? "Saving…" : "Add session"}
            </button>
            <div className="col-span-2 md:col-span-5">
              <label className={labelCls}>Notes</label>
              <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className={inputCls} placeholder="Optional" />
            </div>
            {err && <div className="col-span-2 md:col-span-5 text-[13px] text-[#8f3320]">{err}</div>}
          </form>
          {showConnect && (
            <div className="mt-4 flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-[13px] text-muted-foreground">
              <span>Connect Garmin or Strava</span>
              <span className="text-[11px] uppercase tracking-wider">Coming later</span>
            </div>
          )}
        </Card>
      )}

      <Card title="Sessions" pad={false}>
        {rows.length === 0 ? (
          <p className="px-5 py-4 text-[13.5px] text-muted-foreground">Not recorded. No training sessions logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px] min-w-[560px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-5 py-2 font-semibold">Date</th>
                  <th className="py-2 font-semibold">Type</th>
                  <th className="py-2 font-semibold">Min</th>
                  <th className="py-2 font-semibold">RPE</th>
                  <th className="py-2 font-semibold">sRPE load</th>
                  <th className="py-2 font-semibold">Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/70">
                    <td className="px-5 py-2 num whitespace-nowrap">{fmtDate(r.date)}</td>
                    <td className="py-2">{r.type}</td>
                    <td className="py-2 num">{r.durationMin}</td>
                    <td className="py-2 num">{r.rpe}</td>
                    <td className="py-2 num font-semibold">{r.durationMin * r.rpe}</td>
                    <td className="py-2 text-muted-foreground max-w-[240px] truncate">{r.notes ?? "—"}</td>
                    <td className="py-2 pr-5 text-right">
                      {canEdit && r.source === "manual" && (
                        <button onClick={() => remove.mutate({ sessionId: r.id })} className="text-[12px] text-[#8f3320] hover:underline">
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
