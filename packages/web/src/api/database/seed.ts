// FICTIONAL DEMO DATA seed. Idempotent: running it again (or "Reset demo data" in Admin) wipes the
// demo rows and recreates them relative to today. Real accounts and their own athletes are untouched.
//
//   cd packages/web && bun --env-file=../../.env src/api/database/seed.ts
import { eq, inArray, or } from "drizzle-orm";
import { db } from "./index";
import { user } from "./auth-schema";
import {
  athletes,
  bookings,
  coachAssessments,
  consentLog,
  events,
  invites,
  matchParticipation,
  payments,
  plans,
  recoveryCheckins,
  subscriptions,
  teamAthletes,
  teamMembers,
  teams,
  testAudit,
  tests,
  trainingSessions,
  userProfiles,
  type TestResults,
  type TestStage,
} from "./app-schema";
import {
  POSITIONS,
  PROTOCOL_LT,
  PROTOCOL_SWEAT,
  PROTOCOL_VO2,
  SEED_ASSESS,
  SEED_ATHLETES,
  SEED_FIXTURES,
  SEED_PLANNED_TESTS,
  SEED_TEAM,
  TODAY,
  interpretation,
  lactateStages,
  seedOffsetDays,
  shiftIso,
} from "../../web/lib/demo-data";

export const DEMO_TEAM_ID = SEED_TEAM.id; // "bigboys-rugby"
export const HARBOUR_TEAM_ID = "harbour-town-xv";
export const GATE_ATHLETE_ID = "f02"; // latest test: Analysis complete, NOT paid
export const CLAIMED_ATHLETE_ID = "b01"; // owned by athlete@bigboys-demo.test

interface DemoUser {
  key: "COACH" | "PRACTITIONER" | "ADMIN" | "ATHLETE" | "HARBOUR_COACH";
  email: string;
  name: string;
  role: "coach" | "practitioner" | "individual";
  isAdmin?: boolean;
}

export const DEMO_USERS: DemoUser[] = [
  { key: "COACH", email: "coach@bigboys-demo.test", name: "Nico Vosloo (demo coach)", role: "coach" },
  { key: "PRACTITIONER", email: "practitioner@bigboys-demo.test", name: "Lerato Khumalo (demo practitioner)", role: "practitioner" },
  { key: "ADMIN", email: "admin@vertdirt-demo.test", name: "Vert & Dirt Admin (demo)", role: "practitioner", isAdmin: true },
  { key: "ATHLETE", email: "athlete@bigboys-demo.test", name: "Sipho Ngcobo", role: "individual" },
  { key: "HARBOUR_COACH", email: "coach@harbourtown-demo.test", name: "Pieter Hendricks (demo coach)", role: "coach" },
];

function password(key: DemoUser["key"]) {
  const v = process.env[`DEMO_${key}_PASSWORD`];
  if (v) return v;
  // Fallback for environments without the generated passwords: random, never logged.
  return `Vd-${crypto.randomUUID().slice(0, 12)}`;
}

async function chunked<T>(rows: T[], insert: (part: T[]) => Promise<unknown>, size = 80) {
  for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size));
}

/** Deterministic pseudo-random so the demo looks the same on every reset. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

async function ensureUser(u: DemoUser): Promise<string> {
  const [existing] = await db.select().from(user).where(eq(user.email, u.email));
  if (existing) return existing.id;
  const { auth } = await import("../auth");
  const res = await auth.api.signUpEmail({ body: { email: u.email, password: password(u.key), name: u.name } });
  return res.user.id;
}

async function wipeDemo() {
  const demoTeams = (await db.select({ id: teams.id }).from(teams).where(eq(teams.isDemo, true))).map((r) => r.id);
  const demoAthletes = (await db.select({ id: athletes.id }).from(athletes).where(eq(athletes.isDemo, true))).map((r) => r.id);
  const a = demoAthletes.length ? demoAthletes : ["__none__"];
  const t = demoTeams.length ? demoTeams : ["__none__"];
  const demoTests = (await db.select({ id: tests.id }).from(tests).where(inArray(tests.athleteId, a))).map((r) => r.id);
  const demoBookings = (
    await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(or(eq(bookings.isDemo, true), inArray(bookings.teamId, t)))
  ).map((r) => r.id);
  const demoEvents = (
    await db
      .select({ id: events.id })
      .from(events)
      .where(or(inArray(events.teamId, t), inArray(events.athleteId, a)))
  ).map((r) => r.id);
  const tt = demoTests.length ? demoTests : ["__none__"];
  const bb = demoBookings.length ? demoBookings : ["__none__"];
  const ee = demoEvents.length ? demoEvents : ["__none__"];

  await db.delete(testAudit).where(inArray(testAudit.testId, tt));
  await db.delete(payments).where(or(inArray(payments.testId, tt), inArray(payments.bookingId, bb)));
  await db.delete(tests).where(inArray(tests.id, tt));
  await db.delete(bookings).where(inArray(bookings.id, bb));
  await db.delete(matchParticipation).where(inArray(matchParticipation.eventId, ee));
  await db.delete(events).where(inArray(events.id, ee));
  await db.delete(trainingSessions).where(inArray(trainingSessions.athleteId, a));
  await db.delete(recoveryCheckins).where(inArray(recoveryCheckins.athleteId, a));
  await db.delete(coachAssessments).where(or(inArray(coachAssessments.teamId, t), inArray(coachAssessments.athleteId, a)));
  await db.delete(consentLog).where(or(inArray(consentLog.teamId, t), inArray(consentLog.athleteId, a)));
  await db.delete(teamAthletes).where(or(inArray(teamAthletes.teamId, t), inArray(teamAthletes.athleteId, a)));
  await db.delete(invites).where(or(inArray(invites.teamId, t), inArray(invites.athleteId, a)));
  await db.delete(teamMembers).where(inArray(teamMembers.teamId, t));
  await db.delete(teams).where(inArray(teams.id, t));
  await db.delete(athletes).where(inArray(athletes.id, a));
}

const HARBOUR_ATHLETES: { id: string; name: string; position: string; dob: string }[] = [
  { id: "h01", name: "Callan Daniels", position: "Loosehead prop", dob: "1998-02-11" },
  { id: "h02", name: "Musa Zungu", position: "Hooker", dob: "2000-06-30" },
  { id: "h03", name: "Pieter-Jan Smit", position: "Lock", dob: "1999-09-19" },
  { id: "h04", name: "Owen Jacobs", position: "Openside flanker", dob: "2001-12-03" },
  { id: "h05", name: "Neo Mahlangu", position: "Scrumhalf", dob: "2003-04-25" },
  { id: "h06", name: "Brandon Fortuin", position: "Flyhalf", dob: "2002-07-14" },
  { id: "h07", name: "Kyle Adams", position: "Wing", dob: "2004-01-08" },
  { id: "h08", name: "Sizwe Cele", position: "Fullback", dob: "1997-10-21" },
];

export async function seedDemo() {
  const offset = seedOffsetDays();
  const shift = (iso: string) => shiftIso(iso, offset);
  const ids: Record<DemoUser["key"], string> = {} as Record<DemoUser["key"], string>;
  for (const u of DEMO_USERS) ids[u.key] = await ensureUser(u);

  await wipeDemo();

  // Profiles (role is only ever set server-side).
  for (const u of DEMO_USERS) {
    await db
      .insert(userProfiles)
      .values({ userId: ids[u.key], role: u.role, isAdmin: !!u.isAdmin, onboarding: "done", displayName: u.name, isDemo: true })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: { role: u.role, isAdmin: !!u.isAdmin, onboarding: "done", displayName: u.name, isDemo: true },
      });
  }

  // Plans: structure only, every fee "to be confirmed" (null).
  const PLAN_ROWS = [
    { id: "plan_coach", audience: "coach" as const, name: "Coach", description: "One team: squad passports, team analytics and testing bookings.", sort: 1 },
    { id: "plan_team", audience: "team" as const, name: "Team / Club", description: "Clubs with several teams and staff under one account.", sort: 2 },
    { id: "plan_individual", audience: "individual" as const, name: "Individual", description: "Your own passport, training log, recovery check-ins and calendar.", sort: 3 },
    { id: "plan_enterprise", audience: "enterprise" as const, name: "Enterprise", description: "Unions, academies and high-performance programmes.", sort: 4, contactOnly: true },
  ];
  for (const p of PLAN_ROWS) {
    await db
      .insert(plans)
      .values({ ...p, contactOnly: !!p.contactOnly, currency: "ZAR" })
      .onConflictDoUpdate({ target: plans.id, set: { name: p.name, description: p.description, audience: p.audience, sort: p.sort, contactOnly: !!p.contactOnly } });
  }
  const { ensureSetting } = await import("../lib/settings");
  await ensureSetting("pricing");
  await ensureSetting("trial");
  await ensureSetting("thresholds");

  const demoUserIds = Object.values(ids);
  await db.delete(subscriptions).where(inArray(subscriptions.ownerUserId, demoUserIds));
  await db.insert(subscriptions).values([
    { id: "sub_demo_coach", ownerUserId: ids.COACH, planId: "plan_coach", status: "trial" },
    { id: "sub_demo_athlete", ownerUserId: ids.ATHLETE, planId: "plan_individual", status: "trial" },
    { id: "sub_demo_harbour", ownerUserId: ids.HARBOUR_COACH, planId: "plan_coach", status: "trial" },
  ]);

  // Teams.
  await db.insert(teams).values([
    { id: DEMO_TEAM_ID, name: SEED_TEAM.name, sport: SEED_TEAM.sport, season: SEED_TEAM.season, ownerId: ids.COACH, inviteCode: "BIGB-RGBY", isDemo: true },
    { id: HARBOUR_TEAM_ID, name: "Harbour Town XV", sport: "Rugby union", season: "2026/27", ownerId: ids.HARBOUR_COACH, inviteCode: "HRBR-TWNX", isDemo: true },
  ]);
  await db.insert(teamMembers).values([
    { teamId: DEMO_TEAM_ID, userId: ids.COACH, role: "owner" },
    { teamId: HARBOUR_TEAM_ID, userId: ids.HARBOUR_COACH, role: "owner" },
  ]);

  // Athletes: one row per person.
  const squad = SEED_ATHLETES.map((a, i) => ({
    id: a.id,
    name: a.name,
    sex: a.sex,
    dob: a.dob,
    heightCm: a.heightCm,
    weightKg: a.weightKg,
    sport: "Rugby union",
    position: a.position,
    experience: a.experience,
    goals: a.goals,
    userId: a.id === CLAIMED_ATHLETE_ID ? ids.ATHLETE : null,
    createdBy: ids.COACH,
    isDemo: true,
    squadNumber: i + 1,
  }));
  await chunked(squad, (part) => db.insert(athletes).values(part.map(({ squadNumber: _s, ...r }) => r)));
  await db.insert(athletes).values(
    HARBOUR_ATHLETES.map((h) => ({ ...h, sex: "M" as const, sport: "Rugby union", goals: [], createdBy: ids.HARBOUR_COACH, isDemo: true })),
  );

  const joined = Date.now() - 200 * 86400000;
  await chunked(squad, (part) =>
    db.insert(teamAthletes).values(
      part.map((a) => ({
        teamId: DEMO_TEAM_ID,
        athleteId: a.id,
        squadNumber: a.squadNumber,
        consentBy: a.id === CLAIMED_ATHLETE_ID ? ("athlete" as const) : ("coach_on_behalf" as const),
        consentAt: joined,
        joinedAt: joined,
      })),
    ),
  );
  await db.insert(teamAthletes).values(HARBOUR_ATHLETES.map((h, i) => ({ teamId: HARBOUR_TEAM_ID, athleteId: h.id, squadNumber: i + 1, consentBy: "coach_on_behalf" as const })));
  await db.insert(consentLog).values({
    id: "cl_demo_b01",
    teamId: DEMO_TEAM_ID,
    athleteId: CLAIMED_ATHLETE_ID,
    userId: ids.ATHLETE,
    action: "claimed and confirmed sharing",
    before: null,
    after: { testing: true, training: true, wellness: true },
  });

  // Official tests (fixed block dates: 14 Mar and 12 Sep 2026).
  const testRows: (typeof tests.$inferInsert)[] = [];
  for (const a of SEED_ATHLETES) {
    for (const rec of a.tests) {
      const latest = rec.date === a.lastTest;
      let results: TestResults = {};
      let stages: TestStage[] | null = null;
      if (rec.type === "Lactate threshold") {
        results = latest ? { lt1Pace: a.lt1Pace, lt1Hr: a.lt1Hr, lt2Pace: a.lt2Pace, lt2Hr: a.lt2Hr } : { lt1Pace: a.lt1PacePrev, lt2Pace: a.lt2PacePrev };
        if (latest) stages = lactateStages(a).map((s) => ({ n: s.n, speedKmh: s.speedKmh, hr: s.hr, lactate: s.lactate, rpe: s.rpe }));
      } else if (rec.type === "VO2 max") {
        results = latest ? { vo2: a.vo2 } : { vo2: a.vo2Prev };
      } else {
        results = { sweatRate: a.sweatRate, sodium: a.sodium };
      }
      const status = rec.status;
      const gate = a.id === GATE_ATHLETE_ID && latest;
      testRows.push({
        id: rec.id,
        athleteId: a.id,
        type: rec.type,
        date: rec.date,
        protocol: rec.type === "Lactate threshold" ? PROTOCOL_LT : rec.type === "VO2 max" ? PROTOCOL_VO2 : PROTOCOL_SWEAT,
        equipment: rec.type === "Sweat" ? "Absorbent sweat patches, ion analyser (demo)" : "Motorised treadmill, capillary lactate analyser, metabolic cart (demo)",
        stages,
        results: JSON.parse(JSON.stringify(results)),
        zonesSet: rec.type === "Lactate threshold" ? (latest ? a.zonesSet : true) : false,
        analysis: rec.type === "Lactate threshold" && latest && status !== "Draft" ? interpretation(a).join("\n") : null,
        status,
        paymentStatus: gate ? "unpaid" : "demo",
        enteredBy: ids.PRACTITIONER,
        publishedAt: status === "Published" ? new Date(rec.date + "T12:00:00").getTime() + 7 * 86400000 : null,
        createdAt: new Date(rec.date + "T12:00:00").getTime(),
        updatedAt: new Date(rec.date + "T12:00:00").getTime(),
      });
    }
  }
  // Harbour Town XV: three fictional published VO₂ tests (only visible to their own coach).
  for (const h of HARBOUR_ATHLETES.slice(0, 3)) {
    testRows.push({
      id: `${h.id}-vo2`,
      athleteId: h.id,
      type: "VO2 max",
      date: "2026-08-22",
      protocol: PROTOCOL_VO2,
      results: { vo2: { h01: 50.2, h02: 53.4, h03: 54.1 }[h.id as "h01"] },
      status: "Published",
      paymentStatus: "demo",
      enteredBy: ids.PRACTITIONER,
      publishedAt: new Date("2026-08-29T12:00:00").getTime(),
    });
  }
  await chunked(testRows, (part) => db.insert(tests).values(part));
  const audit = testRows
    .filter((t) => t.date === "2026-09-12" || t.athleteId === GATE_ATHLETE_ID)
    .map((t) => ({
      id: `au_seed_${t.id}`,
      testId: t.id,
      userId: ids.PRACTITIONER,
      userName: DEMO_USERS[1].name,
      action: "created (demo seed)",
      before: {},
      after: { status: t.status, paymentStatus: t.paymentStatus },
      at: t.createdAt as number,
    }));
  await chunked(audit, (part) => db.insert(testAudit).values(part));

  // Coach assessments (coach-entered, never derived from test values). Dates shifted to stay current.
  await chunked(SEED_ATHLETES, (part) =>
    db.insert(coachAssessments).values(
      part.map((a) => {
        const s = SEED_ASSESS[a.id];
        return {
          teamId: DEMO_TEAM_ID,
          athleteId: a.id,
          restStatus: s.rest.status,
          restNote: s.rest.note ?? null,
          restOn: s.rest.assessedOn ? shift(s.rest.assessedOn) : null,
          peakStatus: s.peaking.status,
          peakNote: s.peaking.note ?? null,
          peakOn: s.peaking.assessedOn ? shift(s.peaking.assessedOn) : null,
          updatedBy: ids.COACH,
        };
      }),
    ),
  );

  // Calendar: fixtures + testing, relative to today.
  const eventRows: (typeof events.$inferInsert)[] = SEED_FIXTURES.map((f, i) => ({
    id: `ev_demo_fx${i}`,
    teamId: DEMO_TEAM_ID,
    kind: "match" as const,
    title: `${f.venue === "Home" ? "vs" : "@"} ${f.opponent}`,
    date: shift(f.date),
    time: "15:00",
    location: f.venue === "Home" ? "BigBoys home ground (fictional)" : "Away (fictional)",
    details: { opponent: f.opponent, venue: f.venue, competition: f.competition },
    createdBy: ids.COACH,
  }));
  eventRows.push({
    id: "ev_demo_harbour_fx",
    teamId: HARBOUR_TEAM_ID,
    kind: "match",
    title: "vs BigBoys Rugby (fictional)",
    date: shift(SEED_FIXTURES[1].date),
    time: "15:00",
    details: { opponent: "BigBoys Rugby (fictional)", venue: "Home", competition: "Demo League · Round 8" },
    createdBy: ids.HARBOUR_COACH,
  });

  // Bookings: two requested, one scheduled.
  const untested = SEED_ATHLETES.filter((a) => !a.tested).map((a) => a.id);
  const scheduledDate = shift(SEED_PLANNED_TESTS[0].date);
  await db.insert(bookings).values([
    {
      id: "bk_demo_scheduled",
      requestedBy: ids.COACH,
      requesterRole: "coach",
      teamId: DEMO_TEAM_ID,
      athleteIds: untested,
      testTypes: ["Lactate threshold", "VO2 max"],
      preferredDates: [scheduledDate, shiftIso(scheduledDate, 2)],
      location: "Vert & Dirt lab",
      phone: "+27 00 000 0000 (demo)",
      notes: "Baseline tests for the four untested athletes (fictional).",
      status: "scheduled",
      scheduledFor: scheduledDate,
      isDemo: true,
      createdAt: Date.now() - 6 * 86400000,
    },
    {
      id: "bk_demo_coach_req",
      requestedBy: ids.COACH,
      requesterRole: "coach",
      teamId: DEMO_TEAM_ID,
      athleteIds: ["f04", "f07"],
      testTypes: ["Lactate threshold", "VO2 max"],
      preferredDates: [shift("2026-11-23"), shift("2026-11-25")],
      location: "At our venue",
      phone: "+27 00 000 0000 (demo)",
      notes: "Both due for retest (fictional).",
      isDemo: true,
      createdAt: Date.now() - 2 * 86400000,
    },
    {
      id: "bk_demo_athlete_req",
      requestedBy: ids.ATHLETE,
      requesterRole: "individual",
      teamId: null,
      athleteIds: [CLAIMED_ATHLETE_ID],
      testTypes: ["VO2 max"],
      preferredDates: [shift("2026-11-30")],
      location: "Vert & Dirt lab",
      notes: "Personal retest before the new year (fictional).",
      isDemo: true,
      createdAt: Date.now() - 86400000,
    },
  ]);
  eventRows.push({
    id: "ev_demo_testing",
    teamId: DEMO_TEAM_ID,
    kind: "testing",
    title: "Baseline lactate + VO₂max testing (fictional)",
    date: scheduledDate,
    time: "08:00",
    location: "Vert & Dirt lab",
    bookingId: "bk_demo_scheduled",
    details: {},
    createdBy: ids.PRACTITIONER,
  });
  eventRows.push({
    id: "ev_demo_sweat",
    teamId: DEMO_TEAM_ID,
    kind: "testing",
    title: SEED_PLANNED_TESTS[1].label,
    date: shift(SEED_PLANNED_TESTS[1].date),
    details: { planned: true },
    createdBy: ids.COACH,
  });
  eventRows.push({
    id: "ev_demo_b01_run",
    athleteId: CLAIMED_ATHLETE_ID,
    kind: "competition",
    title: "Parkrun (personal, fictional)",
    date: shiftIso(TODAY, 6),
    time: "08:00",
    details: {},
    createdBy: ids.ATHLETE,
  });
  await db.insert(events).values(eventRows);

  // Training + recovery: some athletes have logs, others have none ("Not recorded").
  const r = rng(42);
  const TYPES = ["Field session", "Conditioning", "Gym: strength", "Recovery run", "Skills"];
  const trainers = ["b01", "f01", "f03", "f08", "f11", "f13", "b05", "b09"];
  const sessions: (typeof trainingSessions.$inferInsert)[] = [];
  for (const id of trainers) {
    for (let d = 27; d >= 1; d--) {
      if (r() < 0.45) continue;
      sessions.push({
        id: `ts_demo_${id}_${d}`,
        athleteId: id,
        date: shiftIso(TODAY, -d),
        type: TYPES[Math.floor(r() * TYPES.length)],
        durationMin: 30 + Math.round(r() * 12) * 5,
        rpe: 3 + Math.floor(r() * 6),
        notes: null,
        source: "manual",
        enteredBy: id === CLAIMED_ATHLETE_ID ? ids.ATHLETE : ids.COACH,
      });
    }
  }
  await chunked(sessions, (part) => db.insert(trainingSessions).values(part));
  const checkers = ["b01", "f01", "f06", "f11", "f12", "b13"];
  const checkins: (typeof recoveryCheckins.$inferInsert)[] = [];
  for (const id of checkers) {
    for (let d = 20; d >= 0; d--) {
      if (r() < 0.3) continue;
      const low = id === "f12" || id === "b13";
      const score = () => Math.max(1, Math.min(5, Math.round((low ? 2.4 : 3.6) + (r() - 0.5) * 2)));
      checkins.push({
        id: `rc_demo_${id}_${d}`,
        athleteId: id,
        date: shiftIso(TODAY, -d),
        sleep: score(),
        soreness: score(),
        fatigue: score(),
        stress: score(),
        enteredBy: id === CLAIMED_ATHLETE_ID ? ids.ATHLETE : ids.COACH,
      });
    }
  }
  await chunked(checkins, (part) => db.insert(recoveryCheckins).values(part));

  return { users: DEMO_USERS.map((u) => u.email), athletes: squad.length + HARBOUR_ATHLETES.length, tests: testRows.length, positions: POSITIONS.length };
}

// ---------- CLI ----------
if (import.meta.main) {
  const envPath = new URL("../../../../../.env", import.meta.url).pathname;
  const fs = await import("node:fs");
  let env = fs.readFileSync(envPath, "utf8");
  const added: string[] = [];
  for (const u of DEMO_USERS) {
    const k = `DEMO_${u.key}_PASSWORD`;
    if (!process.env[k]) {
      const pw = `Vd-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
      process.env[k] = pw;
      env += `${env.endsWith("\n") ? "" : "\n"}${k}=${pw}\n`;
      added.push(k);
    }
  }
  if (added.length) fs.writeFileSync(envPath, env);
  const res = await seedDemo();
  console.log("Seeded", res, added.length ? `(generated ${added.join(", ")} in .env)` : "");
  process.exit(0);
}
