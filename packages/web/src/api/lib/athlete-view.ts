// Builds the passport shape the web app renders, from database rows.
// Unpublished results are REMOVED here (server side) for coaches and individuals, so the values
// never reach their browser. Only the status remains ("Pending release").
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../database";
import { athletes, coachAssessments, tests, type TestResults } from "../database/app-schema";
import type { Athlete, PaymentStatus, PeakingStatus, Position, ReportStatus, RestStatus, SharingSwitches, TestRecord, TestType } from "../../web/lib/demo-data";

type AthleteRow = typeof athletes.$inferSelect;
type TestRow = typeof tests.$inferSelect;
type AssessmentRow = typeof coachAssessments.$inferSelect;

const ORDER: ReportStatus[] = ["Draft", "Under review", "Approved", "Published"];

export interface ViewOptions {
  /** Coaches and individuals: strip values from anything that isn't Published. */
  publishedOnly: boolean;
  /** Coach view: sharing switches from the team link. */
  share?: SharingSwitches;
  squadNumber?: number | null;
  assessment?: AssessmentRow;
}

/** A test as the viewer may see it. */
export function viewTest(t: TestRow, publishedOnly: boolean) {
  const hidden = publishedOnly && t.status !== "Published";
  return {
    id: t.id,
    athleteId: t.athleteId,
    type: t.type as TestType,
    date: t.date,
    protocol: t.protocol ?? "",
    equipment: hidden ? null : t.equipment,
    status: t.status as ReportStatus,
    paymentStatus: (publishedOnly ? undefined : t.paymentStatus) as PaymentStatus | undefined,
    results: hidden ? ({} as TestResults) : (t.results ?? {}),
    stages: hidden ? null : (t.stages ?? null),
    analysis: hidden ? null : t.analysis,
    zonesSet: hidden ? false : t.zonesSet,
    bookingId: publishedOnly ? null : t.bookingId,
    publishedAt: t.publishedAt,
    hidden,
  };
}
export type TestView = ReturnType<typeof viewTest>;

export function buildAthlete(row: AthleteRow, testRows: TestRow[], opts: ViewOptions): Athlete {
  const shareTesting = opts.share ? opts.share.testing : true;
  const visibleTests = shareTesting ? testRows : [];
  const sorted = [...visibleTests].sort((a, b) => (a.date === b.date ? a.type.localeCompare(b.type) : a.date < b.date ? -1 : 1));
  const dates = [...new Set(sorted.map((t) => t.date))];
  const lastTest = dates[dates.length - 1];
  const prevTest = dates.length > 1 ? dates[dates.length - 2] : undefined;
  const latest = sorted.filter((t) => t.date === lastTest).map((t) => viewTest(t, opts.publishedOnly));
  const prev = prevTest ? sorted.filter((t) => t.date === prevTest).map((t) => viewTest(t, opts.publishedOnly)) : [];

  const pick = (list: TestView[], type: TestType) => list.find((t) => t.type === type)?.results ?? {};
  const lt = pick(latest, "Lactate threshold");
  const vo2 = pick(latest, "VO2 max");
  const sweat = pick(latest, "Sweat");
  const ltPrev = pick(prev, "Lactate threshold");
  const vo2Prev = pick(prev, "VO2 max");
  const status: ReportStatus = latest.length ? ORDER[Math.min(...latest.map((t) => ORDER.indexOf(t.status)))] : "Draft";
  const latestLt = latest.find((t) => t.type === "Lactate threshold");

  const records: TestRecord[] = sorted.map((t) => ({
    id: t.id,
    date: t.date,
    type: t.type as TestType,
    status: t.status as ReportStatus,
    protocol: t.protocol ?? "",
    paymentStatus: opts.publishedOnly ? undefined : (t.paymentStatus as PaymentStatus),
  }));

  const a = opts.assessment;
  const rest = a
    ? { status: a.restStatus as RestStatus, assessedOn: a.restOn ?? undefined, note: a.restNote ?? undefined }
    : { status: "Grey" as RestStatus };
  const peaking = a
    ? { status: a.peakStatus as PeakingStatus, assessedOn: a.peakOn ?? undefined, note: a.peakNote ?? undefined }
    : { status: "Insufficient data" as PeakingStatus };

  return {
    id: row.id,
    name: row.name,
    sex: row.sex ?? undefined,
    dob: row.dob ?? undefined,
    heightCm: row.heightCm ?? undefined,
    weightKg: row.weightKg ?? undefined,
    position: (row.position ?? "—") as Position,
    experience: row.experience ?? undefined,
    sport: row.sport ?? undefined,
    squadNumber: opts.squadNumber ?? undefined,
    claimed: row.userId !== null,
    share: opts.share,
    goals: row.goals ?? [],
    tested: records.length > 0,
    lastTest,
    prevTest,
    vo2: vo2.vo2,
    vo2Prev: vo2Prev.vo2,
    lt1Pace: lt.lt1Pace,
    lt1PacePrev: ltPrev.lt1Pace,
    lt1Hr: lt.lt1Hr,
    lt2Pace: lt.lt2Pace,
    lt2PacePrev: ltPrev.lt2Pace,
    lt2Hr: lt.lt2Hr,
    sweatRate: sweat.sweatRate,
    sodium: sweat.sodium,
    status,
    zonesSet: latestLt?.zonesSet ?? false,
    tests: records,
    rest,
    peaking,
  };
}

/** Loads tests for many athletes in one query, grouped by athlete id. */
export async function testsByAthlete(ids: string[]) {
  const map = new Map<string, TestRow[]>();
  if (!ids.length) return map;
  const rows = await db.select().from(tests).where(inArray(tests.athleteId, ids));
  for (const r of rows) map.set(r.athleteId, [...(map.get(r.athleteId) ?? []), r]);
  return map;
}

export async function assessmentsFor(teamId: string, ids: string[]) {
  const map = new Map<string, AssessmentRow>();
  if (!ids.length) return map;
  const rows = await db
    .select()
    .from(coachAssessments)
    .where(and(eq(coachAssessments.teamId, teamId), inArray(coachAssessments.athleteId, ids)));
  for (const r of rows) map.set(r.athleteId, r);
  return map;
}
