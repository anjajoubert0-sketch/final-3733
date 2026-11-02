import { and, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../database";
import { athletes, events, teamAthletes, teamMembers, teams, userProfiles } from "../database/app-schema";
import { authed } from "../middleware/auth";
import { athleteAccess, coachTeamIds, forbidden, isStaff, ownAthlete, requireTeam, todayIso, type Actor } from "../lib/access";
import { assessmentsFor, buildAthlete, testsByAthlete, viewTest } from "../lib/athlete-view";
import { getSetting } from "../lib/settings";
import type { Fixture } from "../../web/lib/demo-data";

function initials(name: string) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "T").slice(0, 2)).toUpperCase();
}

async function teamHeader(teamId: string) {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  const [owner] = await db.select({ name: userProfiles.displayName }).from(userProfiles).where(eq(userProfiles.userId, team.ownerId));
  const ownerName = (owner?.name ?? "").replace(/\s*\(demo coach\)\s*/i, "");
  const parts = ownerName.split(" ").filter(Boolean);
  const headCoach = parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : ownerName || "—";
  return { team, headCoach };
}

async function teamCalendar(teamId: string) {
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.teamId, teamId), gte(events.date, todayIso())));
  rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  const fixtures: Fixture[] = rows
    .filter((e) => e.kind === "match")
    .map((e) => ({
      date: e.date,
      opponent: String(e.details?.opponent ?? e.title),
      venue: (e.details?.venue === "Away" ? "Away" : "Home") as Fixture["venue"],
      competition: String(e.details?.competition ?? ""),
    }));
  const plannedTests = rows.filter((e) => e.kind === "testing").map((e) => ({ date: e.date, label: e.title }));
  return { fixtures, plannedTests };
}

/** Full passport for one athlete, with tests filtered for this viewer. */
export async function athleteDetail(actor: Actor, athleteId: string) {
  const acc = await athleteAccess(actor, athleteId);
  let share = undefined as undefined | { testing: boolean; training: boolean; wellness: boolean };
  let squadNumber: number | null = null;
  let teamId: string | undefined;
  if (acc.kind === "coach") {
    share = { ...acc.view };
    teamId = acc.coachTeamIds[0];
  }
  // Team context: for coaches their team; for self/staff the athlete's first active team.
  const links = await db.select().from(teamAthletes).where(and(eq(teamAthletes.athleteId, athleteId), eq(teamAthletes.status, "active")));
  const link = links.find((l) => l.teamId === teamId) ?? links[0];
  if (!teamId && link) teamId = link.teamId;
  if (link) squadNumber = link.squadNumber;
  const testRows = (await testsByAthlete([athleteId])).get(athleteId) ?? [];
  const assessment = teamId && acc.kind !== "self" ? (await assessmentsFor(teamId, [athleteId])).get(athleteId) : undefined;
  const athlete = buildAthlete(acc.athlete, testRows, { publishedOnly: acc.publishedOnly, share, squadNumber, assessment });
  const visibleTests = share && !share.testing ? [] : testRows.map((t) => viewTest(t, acc.publishedOnly)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const header = teamId ? await teamHeader(teamId) : null;
  const cal = teamId ? await teamCalendar(teamId) : { fixtures: [], plannedTests: [] };
  return {
    athlete,
    tests: visibleTests,
    access: { kind: acc.kind, view: acc.view, edit: acc.edit, canEditProfile: acc.canEditProfile, publishedOnly: acc.publishedOnly },
    team: header ? { id: header.team.id, name: header.team.name, sport: header.team.sport, headCoach: header.headCoach } : null,
    fixtures: cal.fixtures,
  };
}

export const squad = {
  /** A team's squad as the viewer may see it. Coaches: own teams only; staff: any team. */
  list: authed.input(z.object({ teamId: z.string().optional() })).handler(async ({ input, context }) => {
    const a = context.actor;
    let teamId = input.teamId;
    if (!teamId) {
      const mine = await coachTeamIds(a);
      teamId = mine[0];
      if (!teamId && isStaff(a)) {
        const [first] = await db.select({ id: teams.id }).from(teams).limit(1);
        teamId = first?.id;
      }
      if (!teamId) return null;
    }
    await requireTeam(a, teamId, "view");
    const staff = isStaff(a);
    const links = await db
      .select()
      .from(teamAthletes)
      .where(and(eq(teamAthletes.teamId, teamId), eq(teamAthletes.status, "active")));
    const ids = links.map((l) => l.athleteId);
    const rows = ids.length ? await db.select().from(athletes).where(inArray(athletes.id, ids)) : [];
    const testMap = await testsByAthlete(ids);
    const assess = await assessmentsFor(teamId, ids);
    const list = links
      .map((l) => {
        const row = rows.find((r) => r.id === l.athleteId)!;
        return buildAthlete(row, testMap.get(row.id) ?? [], {
          publishedOnly: !staff,
          share: staff ? undefined : { testing: l.shareTesting, training: l.shareTraining, wellness: l.shareWellness },
          squadNumber: l.squadNumber,
          assessment: assess.get(row.id),
        });
      })
      .sort((x, y) => (x.squadNumber ?? 999) - (y.squadNumber ?? 999) || x.name.localeCompare(y.name));
    const { team, headCoach } = await teamHeader(teamId);
    const cal = await teamCalendar(teamId);
    const testedDates = list.flatMap((x) => (x.lastTest ? [x.lastTest] : [])).sort();
    const thresholds = await getSetting("thresholds");
    return {
      team: {
        id: team.id,
        name: team.name,
        sport: team.sport,
        season: team.season ?? "—",
        label: team.isDemo ? "Fictional demo squad" : team.sport,
        logoText: initials(team.name),
        headCoach,
        isDemo: team.isDemo,
        lastTestingDate: testedDates[testedDates.length - 1],
        nextTestingDate: cal.plannedTests[0]?.date,
      },
      athletes: list,
      fixtures: cal.fixtures,
      plannedTests: cal.plannedTests,
      thresholds,
    };
  }),

  /** One passport: tests filtered on the server for this viewer. */
  athlete: authed.input(z.object({ athleteId: z.string() })).handler(async ({ input, context }) => athleteDetail(context.actor, input.athleteId)),

  /** Individual: own passport (null until the profile exists). */
  self: authed.handler(async ({ context }) => {
    if (context.actor.role !== "individual") throw forbidden();
    const mine = await ownAthlete(context.actor);
    if (!mine) return null;
    return athleteDetail(context.actor, mine.id);
  }),

  /** Teams a coach belongs to, with their name (team switcher). */
  coachTeams: authed.handler(async ({ context }) => {
    if (context.actor.role !== "coach") return [];
    return db
      .select({ id: teams.id, name: teams.name, sport: teams.sport })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, context.actor.id));
  }),
};
