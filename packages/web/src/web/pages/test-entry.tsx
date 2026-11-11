import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { type TestType } from "../lib/demo-data";
import { Card, DemoTag, PageHeader, StatusPill } from "../components/shell";
import { useAllAthletes } from "../queries/practitioner";
import { useCreateTest, useTest, useUpdateTest } from "../queries/tests";
import { ErrorNote, Loading, btn, inputCls } from "../components/empty-states";
import { PaymentBadge } from "../components/payment-badge";

type StageRow = { speed: string; hr: string; lactate: string; rpe: string };
const EMPTY_STAGE: StageRow = { speed: "", hr: "", lactate: "", rpe: "" };
const TYPES: TestType[] = ["Lactate threshold", "VO2 max", "Sweat"];
const PROTOCOLS: Record<TestType, string> = {
  "Lactate threshold": "Incremental treadmill, 4 min stages, 1.0 km/h steps, capillary lactate at stage end",
  "VO2 max": "Incremental treadmill to exhaustion, breath-by-breath gas analysis",
  Sweat: "Patch sweat test, 60 min run at fixed intensity, ambient conditions logged",
};
const RESULT_FIELDS: { key: string; label: string; types: TestType[]; pace?: boolean; int?: boolean }[] = [
  { key: "vo2", label: "VO₂max (ml/kg/min)", types: ["VO2 max"] },
  { key: "lt1Pace", label: "LT1 pace (mm:ss /km)", types: ["Lactate threshold"], pace: true },
  { key: "lt1Hr", label: "LT1 heart rate (bpm)", types: ["Lactate threshold"], int: true },
  { key: "lt2Pace", label: "LT2 pace (mm:ss /km)", types: ["Lactate threshold"], pace: true },
  { key: "lt2Hr", label: "LT2 heart rate (bpm)", types: ["Lactate threshold"], int: true },
  { key: "sweatRate", label: "Sweat rate (L/h)", types: ["Sweat"] },
  { key: "sodium", label: "Sweat sodium (mmol/L)", types: ["Sweat"] },
];

const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
const toPace = (s: string) => {
  if (!s.trim()) return undefined;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
const fromPace = (v?: number) => (v ? `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")}` : "");
const today = () => new Date().toISOString().slice(0, 10);

export default function TestEntryPage() {
  const { testId } = useParams<{ testId?: string }>();
  const [, navigate] = useLocation();
  const athletesQ = useAllAthletes();
  const testQ = useTest(testId);
  const create = useCreateTest();
  const update = useUpdateTest();

  const [athleteId, setAthleteId] = useState("");
  const [type, setType] = useState<TestType>("Lactate threshold");
  const [date, setDate] = useState(today());
  const [protocol, setProtocol] = useState(PROTOCOLS["Lactate threshold"]);
  const [equipment, setEquipment] = useState("");
  const [stages, setStages] = useState<StageRow[]>([{ ...EMPTY_STAGE }, { ...EMPTY_STAGE }, { ...EMPTY_STAGE }]);
  const [res, setRes] = useState<Record<string, string>>({});
  const [zonesSet, setZonesSet] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const t = testQ.data?.test;
  useEffect(() => {
    if (!t) return;
    setAthleteId(t.athleteId);
    setType(t.type as TestType);
    setDate(t.date);
    setProtocol(t.protocol ?? "");
    setEquipment(t.equipment ?? "");
    const st = (t.stages ?? []) as { speedKmh: number; hr?: number; lactate?: number; rpe?: number }[];
    if (st.length) setStages(st.map((s) => ({ speed: String(s.speedKmh), hr: s.hr?.toString() ?? "", lactate: s.lactate?.toString() ?? "", rpe: s.rpe?.toString() ?? "" })));
    const r = (t.results ?? {}) as Record<string, number | undefined>;
    setRes(Object.fromEntries(RESULT_FIELDS.map((f) => [f.key, f.pace ? fromPace(r[f.key]) : (r[f.key]?.toString() ?? "")])));
    setZonesSet(!!t.zonesSet);
    setAnalysis(t.analysis ?? "");
  }, [t]);

  if (testId && testQ.isPending) return <Loading label="Loading test" />;
  if (testId && !t) return <ErrorNote error={testQ.error ?? "Test not found."} />;
  const locked = !!t && !["Draft", "Under review"].includes(t.status);

  const setStage = (i: number, k: keyof StageRow, v: string) => setStages((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  const save = async () => {
    setErr(null);
    setSaved(false);
    if (!athleteId) return setErr("Choose an athlete.");
    const results: Record<string, number> = {};
    for (const f of RESULT_FIELDS) {
      if (!f.types.includes(type)) continue;
      const raw = res[f.key] ?? "";
      const v = f.pace ? toPace(raw) : num(raw);
      if (v === undefined) continue;
      if (Number.isNaN(v)) return setErr(`${f.label}: enter a valid value${f.pace ? " like 4:35" : ""}.`);
      results[f.key] = f.int ? Math.round(v) : v;
    }
    const stageRows =
      type === "Lactate threshold"
        ? stages
            .filter((s) => s.speed.trim())
            .map((s, i) => ({ n: i + 1, speedKmh: Number(s.speed), hr: num(s.hr), lactate: num(s.lactate), rpe: num(s.rpe) }))
        : null;
    if (stageRows?.some((s) => [s.speedKmh, s.hr, s.lactate, s.rpe].some((v) => v !== undefined && Number.isNaN(v)))) return setErr("Stage values must be numbers.");
    const body = { type, date, protocol: protocol || null, equipment: equipment || null, stages: stageRows, results, zonesSet, analysis: analysis.trim() || null };
    try {
      if (t) {
        await update.mutateAsync({ testId: t.id, ...body });
        setSaved(true);
      } else {
        const r = await create.mutateAsync({ athleteId, ...body });
        navigate(`/practitioner/testing/entry/${r.id}`);
        setSaved(true);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    }
  };

  const athletes = athletesQ.data ?? [];
  const selected = athletes.find((a) => a.id === athleteId);
  const busy = create.isPending || update.isPending;

  return (
    <div>
      <PageHeader eyebrow="Practitioner only" title={t ? "Edit test results" : "New test"}>
        <StatusPill status={(t?.status ?? "Draft") as "Draft"} />
        {t && <PaymentBadge status={t.paymentStatus as never} />}
        <DemoTag />
      </PageHeader>

      {locked && (
        <div className="rounded-[10px] border border-[#b9793a]/40 bg-[#b9793a]/10 p-4 mb-6 text-[13.5px] text-[#6b431a]">
          This test is {t!.status === "Published" ? "published" : "marked analysis complete"} and locked. Open the report and use “Reopen for correction” to edit it.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <fieldset disabled={locked} className="space-y-6 min-w-0">
          <Card title="1. Session">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13.5px]">
              <Field label="Athlete">
                <select aria-label="Athlete" value={athleteId} onChange={(e) => setAthleteId(e.target.value)} className={inputCls} disabled={!!t}>
                  <option value="">Choose an athlete…</option>
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.position ? ` · ${a.position}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Team">
                <input readOnly aria-label="Team" value={selected ? selected.teams.join(", ") || "Individual" : "—"} className={inputCls + " text-muted-foreground"} />
              </Field>
              <Field label="Test type">
                <select
                  aria-label="Test type"
                  value={type}
                  onChange={(e) => {
                    const v = e.target.value as TestType;
                    setType(v);
                    setProtocol(PROTOCOLS[v]);
                  }}
                  className={inputCls}
                >
                  {TYPES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Session date">
                <input aria-label="Session date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Testing protocol">
                <input aria-label="Testing protocol" value={protocol} onChange={(e) => setProtocol(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Testing equipment">
                <input aria-label="Testing equipment" value={equipment} placeholder="e.g. treadmill, lactate analyser, HR strap" onChange={(e) => setEquipment(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>

          {type === "Lactate threshold" && (
            <Card title="2. Stage data" pad={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground border-b border-border">
                      <th className="px-4 py-2.5 font-semibold">Stage</th>
                      <th className="px-2 py-2.5 font-semibold">Speed km/h</th>
                      <th className="px-2 py-2.5 font-semibold">HR bpm</th>
                      <th className="px-2 py-2.5 font-semibold">Lactate mmol/L</th>
                      <th className="px-2 py-2.5 font-semibold">RPE 6–20</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map((r, i) => (
                      <tr key={i} className="border-t border-border/70">
                        <td className="px-4 py-2 num">{i + 1}</td>
                        {(["speed", "hr", "lactate", "rpe"] as const).map((k) => (
                          <td key={k} className="py-2 px-2">
                            <input
                              aria-label={`Stage ${i + 1} ${k}`}
                              inputMode="decimal"
                              value={r[k]}
                              onChange={(e) => setStage(i, k, e.target.value)}
                              className="w-full min-w-[64px] rounded border border-border bg-background px-2 py-1 num"
                            />
                          </td>
                        ))}
                        <td className="px-4 py-2 text-right">
                          <button type="button" onClick={() => setStages((rows) => rows.filter((_, idx) => idx !== i))} className="text-[12px] text-[#b3412b] hover:underline" disabled={stages.length <= 1}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-border/70">
                <button type="button" onClick={() => setStages((rows) => [...rows, { ...EMPTY_STAGE }])} className="text-[13px] font-semibold text-[#2f5d46] hover:underline">
                  + Add stage
                </button>
              </div>
            </Card>
          )}

          <Card title={`${type === "Lactate threshold" ? "3" : "2"}. Results`}>
            <p className="text-[12.5px] text-muted-foreground mb-4">Enter values from the approved Vert & Dirt analysis. Leave a field empty when it wasn't measured; it shows as “Not tested”.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13.5px]">
              {RESULT_FIELDS.filter((f) => f.types.includes(type)).map((f) => (
                <Field key={f.key} label={f.label}>
                  <input aria-label={f.label} value={res[f.key] ?? ""} placeholder={f.pace ? "e.g. 4:35" : "Not measured"} onChange={(e) => setRes((r) => ({ ...r, [f.key]: e.target.value }))} className={inputCls} />
                </Field>
              ))}
            </div>
            {type === "Lactate threshold" && (
              <label className="mt-4 flex items-center gap-2 text-[13.5px]">
                <input type="checkbox" checked={zonesSet} onChange={(e) => setZonesSet(e.target.checked)} /> Training zones set from these thresholds
              </label>
            )}
          </Card>

          <Card title="Practitioner analysis">
            <textarea
              aria-label="Practitioner analysis"
              value={analysis}
              onChange={(e) => setAnalysis(e.target.value)}
              rows={5}
              placeholder="Interpretation and recommendations. Required before marking analysis complete. Not visible to coaches or athletes until published."
              className="w-full rounded-md border border-border bg-background p-3 text-[13.5px] outline-none focus:border-[#2f5d46]"
            />
          </Card>
        </fieldset>

        <div className="space-y-6">
          <Card title="Save">
            <p className="text-[13px] text-muted-foreground mb-4">Saving keeps the test in its current status. Every change is recorded in the test history.</p>
            <button onClick={save} disabled={busy || locked} className={btn("primary", "w-full")}>
              {busy ? "Saving…" : t ? "Save changes" : "Create test"}
            </button>
            {saved && <p className="mt-3 text-[13px] text-[#2f5d46] font-semibold">Saved.</p>}
            <ErrorNote error={err} className="mt-3" />
            {t && (
              <Link href={`/practitioner/athletes/${t.athleteId}/tests/${t.id}`} className={btn("ghost", "w-full mt-2.5")}>
                Open report and workflow
              </Link>
            )}
            <Link href="/practitioner/testing" className="block text-center mt-3 text-[13px] text-[#2f5d46] hover:underline">
              Back to testing management
            </Link>
          </Card>
          <Card title="Workflow">
            <ol className="space-y-2 text-[13px] text-muted-foreground list-decimal pl-5">
              <li>Results uploaded (draft)</li>
              <li>Under review</li>
              <li>Analysis complete (analysis required)</li>
              <li>Published (payment verified)</li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-1.5">{label}</span>
      {children}
    </label>
  );
}
