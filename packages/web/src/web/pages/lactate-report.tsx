import { useState } from "react";
import { Link, useParams } from "wouter";
import { fmtDate, fmtNum, fmtPace, interpretation, lactateStages, paymentVerified, zones, STATUS_LABEL, type Athlete, type ReportStatus, type Stage } from "../lib/demo-data";
import { Card, DemoTag, PageHeader, Stat, StatusPill } from "../components/shell";
import { LactateCurve } from "../components/charts";
import { useAthlete, type AthleteDetail } from "../hooks/use-squad";
import { useViewerRole } from "../hooks/use-viewer";
import { usePublishTest, useReopenTest, useSetTestStatus, useTestAudit } from "../queries/tests";
import { useMe } from "../queries/me";
import { errorMessage } from "../lib/api";
import { Loading, btn, inputCls } from "../components/empty-states";
import { PaymentBadge } from "../components/payment-badge";

const WORKFLOW: ReportStatus[] = ["Draft", "Under review", "Approved", "Published"];
type TestView = AthleteDetail["tests"][number];

export default function LactateReportPage() {
  const params = useParams<{ id: string; testId: string }>();
  const q = useAthlete(params.id);
  if (q.isPending) return <Loading label="Loading report" />;
  const t = q.data?.tests.find((x) => x.id === params.testId);
  if (!q.data || !t) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-[36px] uppercase">Report not available</h1>
        <p className="text-muted-foreground mt-2">{q.error ? errorMessage(q.error) : "This test doesn't exist or isn't shared with you."}</p>
        <Link href={`/athletes/${params.id}`} className="inline-block mt-4 text-[#2f5d46] font-semibold hover:underline">
          Back to passport
        </Link>
      </div>
    );
  }
  return <ReportView detail={q.data} t={t} passportHref={`/athletes/${params.id}`} />;
}

/** One test report. Values come only from this test's own record (never from another test). */
export function ReportView({ detail, t, passportHref }: { detail: AthleteDetail; t: TestView; passportHref: string }) {
  const role = useViewerRole();
  const base = detail.athlete;
  const r = t.results;
  // The athlete as of this test: profile + this test's values. Previous values = the previous test of the same type.
  const prevSame = detail.tests.filter((x) => x.type === t.type && x.date < t.date && !x.hidden)[0];
  const a: Athlete = { ...base, vo2: r.vo2, lt1Pace: r.lt1Pace, lt1Hr: r.lt1Hr, lt2Pace: r.lt2Pace, lt2Hr: r.lt2Hr, sweatRate: r.sweatRate, sodium: r.sodium, vo2Prev: prevSame?.results.vo2, lt2PacePrev: prevSame?.results.lt2Pace };
  const isLt = t.type === "Lactate threshold";
  const measured = t.stages?.length
    ? t.stages.map((s) => ({ n: s.n, speedKmh: s.speedKmh, pace: 3600 / s.speedKmh, hr: s.hr, lactate: s.lactate, rpe: s.rpe }))
    : null;
  const stages: { n: number; speedKmh: number; pace: number; hr?: number; lactate?: number; rpe?: number }[] = isLt ? (measured ?? lactateStages(a)) : [];
  const curve = stages.filter((s): s is Stage => s.hr !== undefined && s.lactate !== undefined && s.rpe !== undefined);
  const z = zones(a);
  const staff = role === "Practitioner";

  return (
    <div>
      <nav className="text-[12.5px] text-muted-foreground mb-3">
        <Link href={passportHref} className="hover:underline">
          {a.name}
        </Link>{" "}
        / <span className="text-foreground">{t.type} report</span>
      </nav>

      <PageHeader eyebrow={`${fmtDate(t.date)} · ${a.position}${detail.team ? ` · ${detail.team.name}` : ""}`} title={isLt ? "Lactate threshold report" : `${t.type} report`}>
        <StatusPill status={t.status} />
        {staff && <PaymentBadge status={t.paymentStatus} />}
        <DemoTag />
      </PageHeader>

      {staff && <WorkflowCard t={t} athleteId={a.id} />}

      {t.hidden ? (
        <Card>
          <div className="py-8 text-center">
            <div className="font-display text-[26px] uppercase">Pending release</div>
            <p className="text-muted-foreground text-[13.5px] mt-1">Results appear once analysis is complete, payment is verified and Vert &amp; Dirt publishes them.</p>
          </div>
        </Card>
      ) : (
        <>
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
                <Stat label="Sweat sodium" value={a.sodium !== undefined ? String(a.sodium) : "—"} unit={a.sodium !== undefined ? "mmol/L" : undefined} />
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
                stages={curve}
                lt1Speed={a.lt1Pace ? 3600 / a.lt1Pace : 0}
                lt2Speed={a.lt2Pace ? 3600 / a.lt2Pace : 0}
              />
              <p className="mt-2 text-[12.5px] text-muted-foreground">
                {measured ? "Drawn from the recorded stage data (fictional demo values)." : "No stage data recorded; illustrative curve drawn from the entered LT1 and LT2 values."}
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

          <Card title="Stage data" pad={false} right={<span className="text-[12.5px] text-muted-foreground">{stages.length ? `${stages.length} stages · demo values` : "Not recorded"}</span>}>
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
                        <td className="px-3 py-2 num text-right">{s.hr ?? "—"}</td>
                        <td className="px-3 py-2 num text-right">{s.lactate !== undefined ? s.lactate.toFixed(1) : "—"}</td>
                        <td className="px-3 py-2 num text-right">{s.rpe ?? "—"}</td>
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

            <Card title="Practitioner analysis" right={<DemoTag />}>
              {t.analysis ? (
                <p className="text-[14px] leading-relaxed whitespace-pre-line">{t.analysis}</p>
              ) : (
                <p className="text-[13.5px] text-muted-foreground">Not recorded. The practitioner adds the analysis on the test entry screen.</p>
              )}
              <ul className="mt-4 space-y-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
                {interpretation(a).map((l, i) => (
                  <li key={i} className="pl-4 border-l-2 border-[#2f5d46]/30">
                    {l}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[12px] text-[#7a4c1c]">Position notes are demo wording and require practitioner review before any real use.</p>
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
                <dd>{t.equipment ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Release</dt>
                <dd className="text-muted-foreground">{t.publishedAt ? `Published ${new Date(t.publishedAt).toLocaleDateString("en-ZA")}` : "Not yet published"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Report PDF</dt>
                <dd className="text-muted-foreground">Available after publishing. Not generated in the prototype.</dd>
              </div>
            </dl>
          </Card>
        </div>
      )}
        </>
      )}
      {staff && <HistoryCard testId={t.id} />}
    </div>
  );
}

function WorkflowCard({ t, athleteId }: { t: TestView; athleteId: string }) {
  const setStatus = useSetTestStatus();
  const publish = usePublishTest();
  const reopen = useReopenTest();
  const [reason, setReason] = useState("");
  const [showReopen, setShowReopen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const onError = (e: Error) => setErr(errorMessage(e));
  const paid = paymentVerified(t.paymentStatus);
  const publishBlock = t.status !== "Approved" ? "Analysis not complete." : !paid ? "Payment not verified." : null;
  const editable = t.status === "Draft" || t.status === "Under review";

  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ol className="flex flex-wrap items-center gap-2 text-[13px]">
          {WORKFLOW.map((s, i) => {
            const reached = WORKFLOW.indexOf(t.status) >= i;
            return (
              <li key={s} className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 font-semibold ${reached ? "bg-[#2f5d46] text-white" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}. {STATUS_LABEL[s]}
                </span>
                {i < WORKFLOW.length - 1 && <span className="text-muted-foreground">→</span>}
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap items-center gap-2">
          {editable && (
            <Link href={`/practitioner/testing/entry/${t.id}`} className={btn("ghost", "h-9")}>
              Edit results
            </Link>
          )}
          {t.status === "Draft" && (
            <button className={btn("primary", "h-9")} disabled={setStatus.isPending} onClick={() => setStatus.mutate({ testId: t.id, status: "Under review" }, { onError })}>
              Submit for review
            </button>
          )}
          {t.status === "Under review" && (
            <button className={btn("primary", "h-9")} disabled={setStatus.isPending} onClick={() => setStatus.mutate({ testId: t.id, status: "Approved" }, { onError })}>
              Mark analysis complete
            </button>
          )}
          {t.status !== "Published" && (
            <button
              className={btn("primary", "h-9")}
              disabled={!!publishBlock || publish.isPending}
              title={publishBlock ?? "Publish to the athlete and consenting coaches"}
              onClick={() => publish.mutate({ testId: t.id }, { onError })}
            >
              Publish
            </button>
          )}
          {(t.status === "Approved" || t.status === "Published") && (
            <button className={btn("ghost", "h-9")} onClick={() => setShowReopen((v) => !v)}>
              Reopen for correction
            </button>
          )}
        </div>
      </div>
      {t.status !== "Published" && publishBlock && <p className="mt-3 text-[13px] text-[#7a4c1c]">Publish is disabled: {publishBlock}</p>}
      {t.status === "Published" && <p className="mt-3 text-[13px] text-muted-foreground">Published and visible to the athlete and to coaches with testing consent.</p>}
      {t.status !== "Published" && <p className="mt-1 text-[12.5px] text-muted-foreground">Not visible to coaches or athletes until published.</p>}
      {showReopen && (
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            reopen.mutate({ testId: t.id, reason }, { onSuccess: () => { setShowReopen(false); setReason(""); }, onError });
          }}
        >
          <input required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for correction (logged)" className={inputCls + " flex-1 min-w-[220px]"} />
          <button className={btn("danger")} disabled={reopen.isPending}>
            Reopen
          </button>
        </form>
      )}
      {err && <p className="mt-3 text-[13px] text-[#8f3320]">{err}</p>}
      <p className="sr-only">Athlete {athleteId}</p>
    </Card>
  );
}

function HistoryCard({ testId }: { testId: string }) {
  const q = useTestAudit(testId);
  const { data: me } = useMe();
  return (
    <Card title="Change history" className="mt-6" pad={false}>
      {q.isPending ? (
        <Loading label="Loading history" className="py-6" />
      ) : !q.data?.length ? (
        <p className="px-5 py-4 text-[13.5px] text-muted-foreground">No changes recorded.</p>
      ) : (
        <ul className="divide-y divide-border/70">
          {q.data.map((h, i) => {
            const changed = Object.keys({ ...(h.before ?? {}), ...(h.after ?? {}) }).filter((k) => k !== "updatedAt");
            return (
              <li key={i} className="px-5 py-3 text-[13px]">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>
                    <strong className="capitalize">{h.action}</strong> by {h.userName ?? "—"}
                    {me && h.userName === me.name ? " (you)" : ""}
                  </span>
                  <span className="text-muted-foreground num">{new Date(h.at).toLocaleString("en-ZA")}</span>
                </div>
                {h.reason && <div className="text-muted-foreground mt-0.5">Reason: {h.reason}</div>}
                {changed.length > 0 && h.action !== "created" && (
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    {changed.map((k) => (
                      <div key={k} className="truncate">
                        {k}: {fmtVal((h.before as Record<string, unknown> | null)?.[k])} → {fmtVal((h.after as Record<string, unknown> | null)?.[k])}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function fmtVal(v: unknown) {
  if (v === undefined || v === null) return "—";
  if (typeof v === "object") return JSON.stringify(v).slice(0, 120);
  return String(v);
}
