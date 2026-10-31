import { Link, useParams } from "wouter";
import {
  TEAM,
  age,
  changeText,
  classify,
  fmtDate,
  fmtNum,
  fmtPace,
  getAthlete,
  interpretation,
  isDueForRetest,
  reportVisible,
  trendTone,
  zones,
  daysSince,
  daysUntil,
  groupOf,
  peakTone,
  restTone,
  FIXTURES,
  REST_LABEL,
} from "../lib/demo-data";
import { Card, DemoTag, PageHeader, SourceTag, Stat, StatusPill, TrendPill } from "../components/shell";
import { useRole } from "../components/shell";
import { LineChart } from "../components/charts";

const Unmeasured = ({ label = "Not measured" }: { label?: string }) => <span className="text-muted-foreground">{label}</span>;

export default function PassportPage() {
  const params = useParams<{ id: string }>();
  const a = getAthlete(params.id);
  const { role } = useRole();

  if (!a) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-[36px] uppercase">Athlete not found</h1>
        <p className="text-muted-foreground mt-2">No passport exists for this id in the demo team.</p>
        <Link href="/athletes" className="inline-block mt-4 text-[#2f5d46] font-semibold hover:underline">
          Back to team athletes
        </Link>
      </div>
    );
  }

  const trend = classify(a);
  const dueDays = daysSince(a.lastTest);
  const ltTests = a.tests.filter((t) => t.type === "Lactate threshold");
  const vo2Tests = a.tests.filter((t) => t.type === "VO2 max");
  const latestLt = ltTests[ltTests.length - 1];
  const prevLt = ltTests.length > 1 ? ltTests[0] : undefined;
  const z = zones(a);
  const visibleLt = reportVisible(a) && latestLt;
  const latestVo2 = vo2Tests[vo2Tests.length - 1];
  const sweatTest = a.tests.find((t) => t.type === "Sweat");
  // Coaches see results only from Approved or Published reports.
  const hidden = role === "Coach" && a.tested && !reportVisible(a);
  const nextMatch = FIXTURES.find((f) => daysUntil(f.date) >= 0);

  return (
    <div>
      <nav className="flex flex-wrap items-center gap-3 text-[12.5px] text-muted-foreground mb-3">
        <Link href="/athletes" className="rounded-md border border-border bg-card px-2.5 py-1 font-semibold text-foreground hover:bg-background">
          ← Back to team athletes
        </Link>
        <span>
          <Link href="/athletes" className="hover:underline">
            Team athletes
          </Link>{" "}
          / <span className="text-foreground">{a.name}</span>
        </span>
      </nav>

      <PageHeader eyebrow="Athlete passport" title={a.name}>
        <StatusPill status={a.status} />
        {a.tested && isDueForRetest(a) && <TrendPill tone="ochre" label="Due for retest" />}
        <DemoTag />
      </PageHeader>

      {role === "Coach" && (
        <div className="mb-6 rounded-[10px] border border-[#b9793a]/40 bg-[#b9793a]/10 p-4 text-[13.5px] text-[#5e3c17]">
          <strong>Coach view.</strong> Full passport access depends on the athlete's sharing consent. Raw data is read-only, and only
          published reports are visible. Demo: consent granted for team coaching.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        {/* Profile */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-[#2f5d46]/15 grid place-items-center font-display text-[22px] text-[#2f5d46]" aria-label="Profile photo placeholder">
                {a.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </div>
              <div>
                <div className="font-display text-[22px] uppercase leading-tight">{a.name}</div>
                <div className="text-[13px] text-muted-foreground">
                  {a.position} · {groupOf(a)}
                </div>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
              <Field label="Date of birth" value={`${fmtDate(a.dob)} (${age(a.dob)} y)`} />
              <Field label="Sex" value={a.sex === "F" ? "Female" : "Male"} />
              <Field label="Height" value={`${a.heightCm} cm`} />
              <Field label="Weight" value={`${a.weightKg} kg`} />
              <Field label="Sport" value={TEAM.sport} />
              <Field label="Team" value={TEAM.name} />
              <Field label="Position" value={a.position} />
              <Field label="Position group" value={groupOf(a)} />
              <Field label="Coach" value={`${TEAM.headCoach} (demo)`} />
              <Field label="Experience" value={a.experience} />
            </dl>
            <div className="mt-5 border-t border-border/70 pt-4">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-2">Current goals</div>
              <ul className="list-disc pl-5 text-[13.5px] space-y-1">
                {a.goals.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          </Card>

          <Card title="Consent and sharing" right={<DemoTag />}>
            <ul className="space-y-2 text-[13px]">
              <li className="flex justify-between gap-3">
                <span>Coach access (team)</span>
                <span className="font-semibold text-[#2f5d46]">Granted</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Team-level anonymised analytics</span>
                <span className="font-semibold text-[#2f5d46]">Granted</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Named in team report</span>
                <span className="font-semibold text-muted-foreground">Not granted</span>
              </li>
            </ul>
            <p className="mt-3 text-[12px] text-muted-foreground">Athletes can revoke sharing at any time. Revocation UI is not part of this prototype.</p>
          </Card>
        </div>

        <div className="space-y-6 min-w-0">
          {/* Performance snapshot */}
          <Card
            title="Performance snapshot"
            right={
              <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                {a.tested ? `Latest test ${fmtDate(a.lastTest)} · ${dueDays} days ago` : "No testing on record"}
                <SourceTag kind="Measured" />
              </span>
            }
          >
            {!a.tested ? (
              <div className="py-6 text-center">
                <div className="font-display text-[28px] uppercase">Not tested</div>
                <p className="text-muted-foreground text-[13.5px] mt-1">Baseline testing has not been completed. No values are shown.</p>
              </div>
            ) : hidden ? (
              <PendingNote status={a.status} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
                <Stat label="VO₂max" value={fmtNum(a.vo2)} unit="ml/kg/min" />
                <Stat label="LT1 (aerobic)" value={a.lt1Pace ? fmtPace(a.lt1Pace) : "—"} unit="/km" />
                <Stat label="LT2 (anaerobic)" value={a.lt2Pace ? fmtPace(a.lt2Pace) : "—"} unit="/km" />
                <Stat label="Threshold HR (LT2)" value={a.lt2Hr ? String(a.lt2Hr) : "—"} unit="bpm" />
                <Stat label="LT1 heart rate" value={a.lt1Hr ? String(a.lt1Hr) : "—"} unit="bpm" />
                <Stat label="Threshold power" value="Not measured" />
                <div>
                  <Stat label="Sweat rate" value={a.sweatRate !== undefined ? fmtNum(a.sweatRate) : "—"} unit={a.sweatRate !== undefined ? "L/h" : undefined} />
                  {a.sweatRate === undefined && <div className="text-[12px] text-muted-foreground mt-1">No sweat test on record</div>}
                </div>
                <Stat label="Sweat sodium" value={a.sodium !== undefined ? String(a.sodium) : "—"} unit={a.sodium !== undefined ? "mmol/L" : undefined} />
              </div>
            )}
            {a.tested && !hidden && (
              <div className="mt-5 pt-4 border-t border-border/70 flex flex-wrap items-center gap-3 text-[13px]">
                <span className="text-muted-foreground">Change since previous test:</span>
                {a.vo2Prev !== undefined ? <TrendPill tone={trendTone(trend)} label={trend} /> : <Unmeasured label="No comparison available" />}
                <span className="num text-muted-foreground">{a.vo2Prev !== undefined ? changeText(a) : ""}</span>
              </div>
            )}
          </Card>

          {/* Recovery + peaking (coach assessments) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Recovery monitoring" right={<SourceTag kind="Coach assessment" />}>
              <div className="flex flex-wrap items-center gap-2">
                <TrendPill tone={restTone(a.rest.status)} label={`Rest required · ${a.rest.status}`} />
              </div>
              <div className="mt-2 text-[14px] font-semibold">{a.rest.status === "Grey" ? "Insufficient data" : REST_LABEL[a.rest.status]}</div>
              <div className="text-[12.5px] text-muted-foreground mt-1">{a.rest.assessedOn ? `Assessed ${fmtDate(a.rest.assessedOn)} by coaching staff` : "No recovery assessment recorded"}</div>
              {a.rest.note && <p className="text-[13px] mt-2">“{a.rest.note}”</p>}
              <p className="text-[11.5px] text-muted-foreground mt-3">
                Manually entered. Not derived from VO₂max or lactate and not a medical diagnosis. Future inputs: wellness questionnaires, training load, session RPE,
                sleep, HRV trends, soreness and practitioner observations (coming later).
              </p>
            </Card>
            <Card title="Possible peaking" right={<SourceTag kind="Coach assessment" />}>
              <TrendPill tone={peakTone(a.peaking.status)} label={a.peaking.status} />
              <div className="text-[12.5px] text-muted-foreground mt-2">{a.peaking.assessedOn ? `Assigned ${fmtDate(a.peaking.assessedOn)} by coaching staff` : "No peaking assessment recorded"}</div>
              {a.peaking.note && <p className="text-[13px] mt-2">“{a.peaking.note}”</p>}
              {nextMatch && (
                <div className="mt-2 text-[13px]">
                  Next match: <span className="num font-semibold">{fmtDate(nextMatch.date)}</span> · {nextMatch.venue === "Home" ? "vs" : "@"} {nextMatch.opponent} · in {daysUntil(nextMatch.date)} days
                </div>
              )}
              <p className="text-[11.5px] text-muted-foreground mt-3">
                Assigned by the coach. Peak performance is not predicted from VO₂max or lactate testing. Future inputs: training load and testing trends, recovery
                and sport-specific indicators (coming later).
              </p>
            </Card>
          </div>

          {/* Test results */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Lactate testing" right={<SourceTag kind="Measured" />}>
              {!latestLt ? (
                <Insufficient text="No lactate test on record" />
              ) : hidden ? (
                <PendingNote status={a.status} compact />
              ) : (
                <>
                  <dl className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-[13px]">
                    <Field label="LT1 pace" value={a.lt1Pace ? `${fmtPace(a.lt1Pace)}/km` : "—"} />
                    <Field label="LT1 HR" value={a.lt1Hr ? `${a.lt1Hr} bpm` : "—"} />
                    <Field label="LT2 pace" value={a.lt2Pace ? `${fmtPace(a.lt2Pace)}/km` : "—"} />
                    <Field label="LT2 HR" value={a.lt2Hr ? `${a.lt2Hr} bpm` : "—"} />
                    <Field label="Test date" value={fmtDate(latestLt.date)} />
                    <Field label="Previous LT2" value={a.lt2PacePrev ? `${fmtPace(a.lt2PacePrev)}/km` : "—"} />
                  </dl>
                  <p className="text-[11.5px] text-muted-foreground mt-3">{latestLt.protocol}</p>
                  <Link href={`/athletes/${a.id}/tests/${latestLt.id}`} className="inline-block mt-2 text-[13px] font-semibold text-[#2f5d46] hover:underline">
                    Open lactate report →
                  </Link>
                </>
              )}
            </Card>
            <Card title="VO₂ testing" right={<SourceTag kind="Measured" />}>
              {!latestVo2 ? (
                <Insufficient text="No VO₂max test on record" />
              ) : hidden ? (
                <PendingNote status={a.status} compact />
              ) : (
                <>
                  <dl className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-[13px]">
                    <Field label="VO₂max" value={a.vo2 !== undefined ? `${fmtNum(a.vo2)} ml/kg/min` : "—"} />
                    <Field label="Previous" value={a.vo2Prev !== undefined ? `${fmtNum(a.vo2Prev)} ml/kg/min` : "—"} />
                    <Field label="Test date" value={fmtDate(latestVo2.date)} />
                    <Field label="Previous date" value={fmtDate(a.prevTest)} />
                  </dl>
                  <p className="text-[11.5px] text-muted-foreground mt-3">{latestVo2.protocol}</p>
                  <Link href={`/athletes/${a.id}/tests/${latestVo2.id}`} className="inline-block mt-2 text-[13px] font-semibold text-[#2f5d46] hover:underline">
                    Open VO₂ report →
                  </Link>
                </>
              )}
            </Card>
            <Card title="Sweat testing" right={<SourceTag kind="Measured" />}>
              {!sweatTest ? (
                <Insufficient text="Not tested" sub="No sweat test on record. Values are not estimated." />
              ) : hidden ? (
                <PendingNote status={a.status} compact />
              ) : (
                <>
                  <dl className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-[13px]">
                    <Field label="Sweat rate" value={a.sweatRate !== undefined ? `${fmtNum(a.sweatRate)} L/h` : "—"} />
                    <Field label="Sweat sodium" value={a.sodium !== undefined ? `${a.sodium} mmol/L` : "—"} />
                    <Field label="Test date" value={fmtDate(sweatTest.date)} />
                  </dl>
                  <p className="text-[11.5px] text-muted-foreground mt-3">{sweatTest.protocol}</p>
                </>
              )}
            </Card>
          </div>

          {/* Trend */}
          <Card title="Performance trends" right={<SourceTag kind="Measured" />}>
            {hidden ? (
              <PendingNote status={a.status} compact />
            ) : a.tests.length && a.prevTest ? (
              <>
                <LineChart
                  series={[
                    { label: "VO₂max", color: "#2f5d46", values: [a.vo2Prev, a.vo2] },
                  ]}
                  xLabels={[fmtDate(a.prevTest), fmtDate(a.lastTest)]}
                  yLabel="VO₂max (ml/kg/min)"
                  height={200}
                />
                <LineChart
                  series={[{ label: "LT2 pace", color: "#b3412b", values: [a.lt2PacePrev, a.lt2Pace] }]}
                  xLabels={[fmtDate(a.prevTest), fmtDate(a.lastTest)]}
                  yLabel="LT2 (s/km)"
                  height={200}
                  yDigits={0}
                />
                <p className="text-[12.5px] text-muted-foreground mt-2">
                  Two data points only. A line between them is not a trend. Lines appear only where both tests use the same protocol.
                </p>
              </>
            ) : (
              <p className="text-[13.5px] text-muted-foreground">Fewer than two comparable tests. No trend is drawn.</p>
            )}
          </Card>

          {/* Zones */}
          <Card
            title="Training zones (LT-based)"
            right={
              <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                {a.zonesSet ? "Set by practitioner" : "Not yet set"}
                <SourceTag kind="Calculated" />
              </span>
            }
          >
            {role === "Coach" && !a.zonesSet && z.length > 0 ? (
              <p className="text-muted-foreground text-[13.5px]">Zones are pending practitioner approval and are not yet shared with the coach.</p>
            ) : hidden ? (
              <PendingNote status={a.status} compact />
            ) : z.length === 0 ? (
              <p className="text-muted-foreground text-[13.5px]">Zones are calculated from LT1 and LT2. Not available until both are measured and approved.</p>
            ) : (
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    <th className="py-2 font-semibold">Zone</th>
                    <th className="py-2 font-semibold">Name</th>
                    <th className="py-2 font-semibold">Pace range (/km)</th>
                  </tr>
                </thead>
                <tbody>
                  {z.map((zn) => (
                    <tr key={zn.name} className="border-t border-border/70">
                      <td className="py-2 font-semibold">{zn.name}</td>
                      <td className="py-2">{zn.label}</td>
                      <td className="py-2 num">
                        {zn.fromPace && zn.toPace
                          ? `${fmtPace(zn.fromPace)} – ${fmtPace(zn.toPace)}`
                          : zn.fromPace
                            ? `faster than ${fmtPace(zn.fromPace)}`
                            : `slower than ${fmtPace(zn.toPace)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!a.zonesSet && z.length > 0 && <p className="mt-3 text-[12.5px] text-[#7a4c1c]">Zones are pending practitioner approval; not yet shared with coach.</p>}
          </Card>

          {/* Interpretation */}
          <Card title="Practitioner-approved recommendations" right={<SourceTag kind="Practitioner interpretation" />}>
            {a.tested && reportVisible(a) ? (
              <ul className="space-y-2.5 text-[14px] leading-relaxed">
                {interpretation(a).map((l, i) => (
                  <li key={i} className="pl-4 border-l-2 border-[#2f5d46]/40">
                    {l}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-[13.5px]">
                {a.tested ? "Recommendations are pending practitioner approval. Nothing is shared until the report is Approved or Published." : "Insufficient data: no recommendations until a test is completed and approved."}
              </p>
            )}
          </Card>

          {/* History */}
          <Card title="Testing history" pad={false}>
            <ul className="divide-y divide-border/70">
              {a.tests.length === 0 && <li className="px-5 py-4 text-muted-foreground text-[13.5px]">No tests recorded.</li>}
              {[...a.tests].reverse().map((t) => (
                <li key={t.id} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[14px]">
                      <span className="num">{fmtDate(t.date)}</span> · {t.type}
                    </div>
                    <div className="text-[12.5px] text-muted-foreground">{t.protocol}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill status={t.status} />
                    {(t.type === "Lactate threshold" || t.type === "VO2 max") && (role !== "Coach" || t.status === "Published" || t.status === "Approved") && (
                      <Link href={`/athletes/${a.id}/tests/${t.id}`} className="text-[13px] font-semibold text-[#2f5d46] hover:underline">
                        Open report →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {!visibleLt && a.tested && (
            <p className="text-[12.5px] text-muted-foreground">Reports in Draft or Under review are not visible to coaches or athletes.</p>
          )}
          <p className="text-[12.5px] text-muted-foreground">
            VO₂ tests on record: {vo2Tests.length}. Lactate tests on record: {ltTests.length}. Previous LT test: {prevLt ? fmtDate(prevLt.date) : "none"}.
          </p>
        </div>
      </div>
    </div>
  );
}

function PendingNote({ status, compact }: { status: string; compact?: boolean }) {
  return (
    <div className={compact ? "py-1" : "py-6 text-center"}>
      <div className={compact ? "text-[13px] font-semibold uppercase tracking-wide" : "font-display text-[24px] uppercase"}>Report not yet released</div>
      <p className="text-muted-foreground text-[13px] mt-1">
        Status: {status}. Coaches only see results from Approved or Published reports.
      </p>
    </div>
  );
}

function Insufficient({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="py-1">
      <div className="text-[13px] font-semibold uppercase tracking-wide">{text}</div>
      <p className="text-muted-foreground text-[12.5px] mt-1">{sub ?? "Insufficient data. No values are shown."}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
