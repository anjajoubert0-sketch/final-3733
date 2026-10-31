import { Link, useParams } from "wouter";
import { TEAM, fmtDate, fmtNum, fmtPace, getAthlete, getTest, interpretation, lactateStages, zones, type ReportStatus } from "../lib/demo-data";
import { Card, DemoTag, PageHeader, Stat, StatusPill } from "../components/shell";
import { useRole } from "../components/shell";
import { LactateCurve } from "../components/charts";

const WORKFLOW: ReportStatus[] = ["Draft", "Under review", "Approved", "Published"];

const NEXT_ACTION: Partial<Record<ReportStatus, { label: string; to: ReportStatus; note: string }>> = {
  Draft: { label: "Submit for review", to: "Under review", note: "Practitioner submits the calculated report." },
  "Under review": { label: "Approve", to: "Approved", note: "A qualified practitioner signs off the interpretation." },
  Approved: { label: "Publish to coach and athlete", to: "Published", note: "Only published reports are visible to authorised users." },
};

export default function LactateReportPage() {
  const params = useParams<{ id: string; testId: string }>();
  const a = getAthlete(params.id);
  const t = a ? getTest(a, params.testId) : undefined;
  const { role } = useRole();

  if (!a || !t) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-[36px] uppercase">Test not found</h1>
        <Link href="/athletes" className="inline-block mt-4 text-[#2f5d46] font-semibold hover:underline">
          Back to team athletes
        </Link>
      </div>
    );
  }

  const isLt = t.type === "Lactate threshold";
  const stages = isLt ? lactateStages(a) : [];
  const z = zones(a);
  const action = NEXT_ACTION[t.status];
  const canAct = role === "Practitioner" && action !== undefined;
  const visibleToCoach = t.status === "Published";

  return (
    <div>
      <nav className="text-[12.5px] text-muted-foreground mb-3">
        <Link href="/athletes" className="hover:underline">
          Team athletes
        </Link>{" "}
        /{" "}
        <Link href={`/athletes/${a.id}`} className="hover:underline">
          {a.name}
        </Link>{" "}
        / <span className="text-foreground">{t.type} report</span>
      </nav>

      <PageHeader eyebrow={`${fmtDate(t.date)} · ${a.position} · ${TEAM.name}`} title={isLt ? "Lactate threshold report" : `${t.type} report`}>
        <StatusPill status={t.status} />
        <DemoTag />
      </PageHeader>

      {/* Workflow */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ol className="flex flex-wrap items-center gap-2 text-[13px]">
            {WORKFLOW.map((s, i) => {
              const reached = WORKFLOW.indexOf(t.status) >= i;
              return (
                <li key={s} className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 font-semibold ${reached ? "bg-[#2f5d46] text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {i + 1}. {s}
                  </span>
                  {i < WORKFLOW.length - 1 && <span className="text-muted-foreground">→</span>}
                </li>
              );
            })}
          </ol>
          <div className="flex items-center gap-3">
            {action && (
              <button
                disabled={!canAct}
                className="rounded-md bg-[#2f5d46] text-white px-3.5 py-2 text-[13px] font-semibold disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                title={canAct ? action.note : "Only practitioners can change report status"}
              >
                {action.label}
              </button>
            )}
            {!action && <span className="text-[13px] text-muted-foreground">Published. Re-issue requires a new version.</span>}
          </div>
        </div>
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          {role === "Coach"
            ? "Coaches cannot publish or change report status. Buttons are disabled in this view."
            : "Demo only: buttons do not change state. Approval actions and audit logging are part of the backend phase."}
          {!visibleToCoach && " This report is not visible to coaches or athletes yet."}
        </p>
      </Card>

      {!isLt && (
        <Card title={`${t.type} summary`} right={<DemoTag />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {t.type === "VO2 max" && (
              <>
                <Stat label="VO₂max" value={fmtNum(a.vo2)} unit="ml/kg/min" />
                <Stat label="Previous VO₂max" value={fmtNum(a.vo2Prev)} unit="ml/kg/min" />
                <Stat label="Peak HR" value="Not measured" />
                <Stat label="Speed at VO₂max" value="Not measured" />
              </>
            )}
            {t.type === "Sweat" && (
              <>
                <Stat label="Sweat rate" value={fmtNum(a.sweatRate)} unit="L/h" />
                <Stat label="Sweat sodium" value={a.sodium !== undefined ? String(a.sodium) : "—"} unit={a.sodium !== undefined ? "mg/L" : undefined} />
                <Stat label="Fluid intake" value="Not recorded" />
                <Stat label="Ambient conditions" value="Not recorded" />
              </>
            )}
          </div>
          <p className="mt-5 text-[12.5px] text-muted-foreground">Full graphs and raw stage data for this test type follow the same layout as the lactate report and are not drawn in this prototype.</p>
        </Card>
      )}

      {isLt && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
            <Card title="Lactate curve" right={<DemoTag />}>
              <LactateCurve
                stages={stages}
                lt1Speed={a.lt1Pace ? 3600 / a.lt1Pace : 0}
                lt2Speed={a.lt2Pace ? 3600 / a.lt2Pace : 0}
              />
              <p className="mt-2 text-[12.5px] text-muted-foreground">
                Illustrative curve drawn from demo LT1 and LT2 values. Lactate values are demo-generated, not measured.
              </p>
            </Card>

            <Card title="Key results">
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Stat label="LT1 · aerobic" value={a.lt1Pace ? fmtPace(a.lt1Pace) : "—"} unit="/km" />
                <Stat label="LT1 heart rate" value={a.lt1Hr ? String(a.lt1Hr) : "—"} unit="bpm" />
                <Stat label="LT2 · anaerobic" value={a.lt2Pace ? fmtPace(a.lt2Pace) : "—"} unit="/km" />
                <Stat label="LT2 heart rate" value={a.lt2Hr ? String(a.lt2Hr) : "—"} unit="bpm" />
                <Stat label="Speed at LT2" value={a.lt2Pace ? (3600 / a.lt2Pace).toFixed(1) : "—"} unit="km/h" />
                <Stat label="Threshold power" value="Not measured" />
              </div>
              <div className="mt-5 pt-4 border-t border-border/70 text-[12.5px] text-muted-foreground">
                Method: LT1 at 2.0 mmol/L and LT2 at 4.0 mmol/L (demo). Threshold calculation uses the approved Vert & Dirt method; the calculation itself is not implemented in this prototype.
              </div>
            </Card>
          </div>

          <Card title="Stage data" pad={false} right={<span className="text-[12.5px] text-muted-foreground">{stages.length} stages · demo values</span>}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground border-b border-border">
                    <th className="px-5 py-2.5 font-semibold">Stage</th>
                    <th className="px-3 py-2.5 font-semibold">Duration</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Speed (km/h)</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Pace (/km)</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Heart rate (bpm)</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Lactate (mmol/L)</th>
                    <th className="px-3 py-2.5 font-semibold text-right">RPE (6–20)</th>
                    <th className="px-5 py-2.5 font-semibold">Marker</th>
                  </tr>
                </thead>
                <tbody>
                  {stages.map((s) => {
                    const marker = a.lt2Pace && Math.abs(s.pace - a.lt2Pace) < 4 ? "≈ LT2" : a.lt1Pace && Math.abs(s.pace - a.lt1Pace) < 4 ? "≈ LT1" : "";
                    return (
                      <tr key={s.n} className="border-t border-border/70">
                        <td className="px-5 py-2 num">{s.n}</td>
                        <td className="px-3 py-2 num text-muted-foreground">4 min</td>
                        <td className="px-3 py-2 num text-right">{s.speedKmh.toFixed(1)}</td>
                        <td className="px-3 py-2 num text-right">{fmtPace(s.pace)}</td>
                        <td className="px-3 py-2 num text-right">{s.hr}</td>
                        <td className="px-3 py-2 num text-right">{s.lactate.toFixed(1)}</td>
                        <td className="px-3 py-2 num text-right">{s.rpe}</td>
                        <td className="px-5 py-2 text-[12px] font-semibold text-[#7a4c1c]">{marker}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card title="Training zones">
              {z.length === 0 ? (
                <p className="text-muted-foreground text-[13.5px]">Not calculated.</p>
              ) : (
                <ul className="space-y-2 text-[13.5px]">
                  {z.map((zn) => (
                    <li key={zn.name} className="flex justify-between gap-3 border-b border-border/60 pb-2">
                      <span>
                        <strong>{zn.name}</strong> {zn.label}
                      </span>
                      <span className="num text-muted-foreground">
                        {zn.fromPace && zn.toPace
                          ? `${fmtPace(zn.fromPace)}–${fmtPace(zn.toPace)} /km`
                          : zn.fromPace
                            ? `< ${fmtPace(zn.fromPace)} /km`
                            : `> ${fmtPace(zn.toPace)} /km`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Interpretation" right={<DemoTag />}>
              <ul className="space-y-2.5 text-[14px] leading-relaxed">
                {interpretation(a).map((l, i) => (
                  <li key={i} className="pl-4 border-l-2 border-[#2f5d46]/40">
                    {l}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[12px] text-[#7a4c1c]">Demo wording. Requires practitioner review before any real use.</p>
            </Card>
          </div>

          <Card title="Testing method and equipment">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-[13.5px]">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Protocol</dt>
                <dd>{t.protocol}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Equipment</dt>
                <dd>Not recorded in demo (treadmill, lactate analyser, HR strap: to be entered)</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Practitioner observations</dt>
                <dd className="text-muted-foreground">Demo placeholder. Practitioner comments are entered on the test-entry screen.</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Report PDF</dt>
                <dd className="text-muted-foreground">Available after approval. Not generated in the prototype.</dd>
              </div>
            </dl>
          </Card>
        </div>
      )}
    </div>
  );
}
