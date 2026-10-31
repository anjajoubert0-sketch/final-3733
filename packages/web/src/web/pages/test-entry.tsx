import { useState } from "react";
import { ATHLETES, TEAM, fmtDate, type TestType } from "../lib/demo-data";
import { Card, DemoTag, PageHeader, StatusPill } from "../components/shell";

interface StageRow {
  speed: string;
  hr: string;
  lactate: string;
  rpe: string;
}

const EMPTY_STAGE: StageRow = { speed: "", hr: "", lactate: "", rpe: "" };
const PROTOCOLS: Record<TestType, string[]> = {
  "Lactate threshold": ["Incremental treadmill, 4 min stages, 1.0 km/h steps (demo)", "Field 1 km repeats, capillary lactate (demo)"],
  "VO2 max": ["Incremental treadmill to exhaustion, breath-by-breath (demo)"],
  Sweat: ["Patch sweat test, 60 min fixed intensity (demo)"],
};

export default function TestEntryPage() {
  const [athleteId, setAthleteId] = useState(ATHLETES[0].id);
  const [type, setType] = useState<TestType>("Lactate threshold");
  const [date, setDate] = useState("2026-10-20");
  const [protocol, setProtocol] = useState(PROTOCOLS["Lactate threshold"][0]);
  const [equipment, setEquipment] = useState("Treadmill, handheld lactate analyser, chest HR strap (demo)");
  const [stages, setStages] = useState<StageRow[]>([{ ...EMPTY_STAGE }, { ...EMPTY_STAGE }, { ...EMPTY_STAGE }]);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const athlete = ATHLETES.find((a) => a.id === athleteId) ?? ATHLETES[0];

  const update = (i: number, k: keyof StageRow, v: string) => setStages((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const complete = stages.filter((r) => r.speed && r.hr && r.lactate).length;

  const changeType = (t: TestType) => {
    setType(t);
    setProtocol(PROTOCOLS[t][0]);
  };

  return (
    <div>
      <PageHeader eyebrow="Practitioner only" title="Test entry">
        <StatusPill status="Draft" />
        <DemoTag />
      </PageHeader>

      <div className="rounded-[10px] border border-[#2f5d46]/30 bg-[#2f5d46]/8 p-4 mb-6 text-[13.5px] text-[#25422f]">
        Raw data is entered once and locked after review. Coaches cannot edit raw values. Results are calculated only with the approved Vert & Dirt method, which is not connected in this prototype. Nothing on this screen is saved.
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <div className="space-y-6">
          <Card title="1. Session">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13.5px]">
              <Field label="Athlete">
                <select aria-label="Athlete" value={athleteId} onChange={(e) => setAthleteId(e.target.value)} className={inputCls}>
                  {ATHLETES.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.position}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Team">
                <input readOnly aria-label="Team" value={TEAM.name} className={inputCls + " text-muted-foreground"} />
              </Field>
              <Field label="Test type">
                <select aria-label="Test type" value={type} onChange={(e) => changeType(e.target.value as TestType)} className={inputCls}>
                  {(Object.keys(PROTOCOLS) as TestType[]).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Session date">
                <input aria-label="Session date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Testing protocol">
                <select aria-label="Testing protocol" value={protocol} onChange={(e) => setProtocol(e.target.value)} className={inputCls}>
                  {PROTOCOLS[type].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Testing equipment">
                <input aria-label="Testing equipment" value={equipment} onChange={(e) => setEquipment(e.target.value)} className={inputCls} />
              </Field>
              <div className="md:col-span-2 text-[12.5px] text-muted-foreground">
                Athlete: {athlete.sex === "F" ? "Female" : "Male"} · {athlete.position} · last test {athlete.tested ? fmtDate(athlete.lastTest) : "none"}
              </div>
            </div>
          </Card>

          {type === "Lactate threshold" && (
            <Card title="2. Stage data" pad={false} right={<span className="text-[12.5px] text-muted-foreground num">{complete} complete stage(s)</span>}>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground border-b border-border">
                      <th className="px-4 py-2.5 font-semibold">Stage</th>
                      <th className="px-2 py-2.5 font-semibold">Speed km/h</th>
                      <th className="px-2 py-2.5 font-semibold">Pace (auto)</th>
                      <th className="px-2 py-2.5 font-semibold">HR bpm</th>
                      <th className="px-2 py-2.5 font-semibold">Lactate mmol/L</th>
                      <th className="px-2 py-2.5 font-semibold">RPE 6–20</th>
                      <th className="px-4 py-2.5 font-semibold">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map((r, i) => {
                      const v = parseFloat(r.speed);
                      return (
                        <tr key={i} className="border-t border-border/70">
                          <td className="px-4 py-2 num">{i + 1}</td>
                          {(["speed", "hr", "lactate", "rpe"] as const).map((k) => (
                            <td key={k} className="py-2 px-2">
                              <input
                                aria-label={`Stage ${i + 1} ${k}`}
                                inputMode="decimal"
                                value={r[k]}
                                onChange={(e) => update(i, k, e.target.value)}
                                className="w-full min-w-[72px] rounded border border-border bg-background px-2 py-1 num"
                              />
                            </td>
                          ))}
                          <td className="px-2 py-2 num text-muted-foreground">{v > 0 ? `${Math.floor(3600 / v / 60)}:${Math.round((3600 / v) % 60).toString().padStart(2, "0")} /km` : "—"}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => setStages((rows) => rows.filter((_, idx) => idx !== i))}
                              className="text-[12px] text-[#b3412b] hover:underline"
                              disabled={stages.length <= 1}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-border/70 flex items-center justify-between">
                <button onClick={() => setStages((rows) => [...rows, { ...EMPTY_STAGE }])} className="text-[13px] font-semibold text-[#2f5d46] hover:underline">
                  + Add stage
                </button>
                <span className="text-[12px] text-muted-foreground">Stage duration: 4 min (protocol default). Stage speed is the raw input; pace is derived.</span>
              </div>
            </Card>
          )}

          {type === "VO2 max" && (
            <Card title="2. Metabolic data">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[13.5px]">
                {["Measured VO₂max (ml/kg/min)", "Peak HR (bpm)", "Test duration (min)", "Peak speed (km/h)", "Peak power (W)", "Respiratory exchange ratio"].map((l) => (
                  <Field key={l} label={l}>
                    <input aria-label={l} placeholder="Not measured" className={inputCls} />
                  </Field>
                ))}
              </div>
            </Card>
          )}

          {type === "Sweat" && (
            <Card title="2. Sweat data">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[13.5px]">
                {["Pre-test body mass (kg)", "Post-test body mass (kg)", "Fluid intake (L)", "Duration (min)", "Sweat sodium (mmol/L)", "Ambient temperature (°C)", "Relative humidity (%)"].map((l) => (
                  <Field key={l} label={l}>
                    <input aria-label={l} placeholder="Not measured" className={inputCls} />
                  </Field>
                ))}
              </div>
            </Card>
          )}

          <Card title="3. Practitioner observations">
            <textarea
              aria-label="Practitioner observations"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Observations, athlete condition, protocol deviations. Visible to the practitioner only until the report is approved."
              className="w-full rounded-md border border-border bg-background p-3 text-[13.5px] outline-none focus:border-[#2f5d46]"
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Workflow">
            <ol className="space-y-3 text-[13.5px]">
              {[
                ["Draft", "Raw data entered, calculation not yet run", true],
                ["Under review", "Calculated with approved method, interpretation pending", false],
                ["Approved", "Signed off by a qualified practitioner", false],
                ["Published", "Visible to authorised athlete and coach", false],
              ].map(([s, d, on], i) => (
                <li key={s as string} className="flex gap-3">
                  <span className={`h-6 w-6 shrink-0 rounded-full grid place-items-center text-[12px] font-semibold ${on ? "bg-[#2f5d46] text-white" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-semibold">{s as string}</div>
                    <div className="text-[12.5px] text-muted-foreground">{d as string}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Actions">
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => setMessage("Demo only: draft not saved. Persistence and audit logging come in the backend phase.")}
                className="rounded-md border border-border bg-card px-4 py-2.5 text-[14px] font-semibold hover:bg-background"
              >
                Save draft
              </button>
              <button
                onClick={() => setMessage("Demo only: calculation requires the approved Vert & Dirt method. Not connected in this prototype.")}
                className="rounded-md bg-[#2f5d46] text-white px-4 py-2.5 text-[14px] font-semibold hover:bg-[#264d3a]"
              >
                Calculate results
              </button>
              <button disabled className="rounded-md bg-muted text-muted-foreground px-4 py-2.5 text-[14px] font-semibold cursor-not-allowed">
                Submit for review (after calculation)
              </button>
            </div>
            {message && <p className="mt-4 text-[12.5px] text-[#7a4c1c] bg-[#b9793a]/10 rounded-md p-3">{message}</p>}
          </Card>

          <Card title="Upload raw file" right={<DemoTag />}>
            <div className="rounded-md border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
              Drop instrument export (CSV / XLSX) here. Parsing is not built in the prototype.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-[13.5px] outline-none focus:border-[#2f5d46]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-1.5">{label}</span>
      {children}
    </label>
  );
}
