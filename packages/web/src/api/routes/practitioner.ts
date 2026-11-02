// Practitioner hub: counts and plain lists. Practitioners and admins only.
import { eq, inArray } from "drizzle-orm";
import { db } from "../database";
import { user } from "../database/auth-schema";
import { athletes, bookings, teamAthletes, teamMembers, teams, tests, userProfiles } from "../database/app-schema";
import { practitionerOnly } from "../middleware/auth";

export const practitionerRouter = {
  hub: practitionerOnly.handler(async () => {
    const profiles = await db.select({ role: userProfiles.role }).from(userProfiles);
    const t = await db.select({ status: tests.status }).from(tests);
    const b = await db.select({ status: bookings.status }).from(bookings);
    return {
      coaches: profiles.filter((p) => p.role === "coach").length,
      individuals: profiles.filter((p) => p.role === "individual").length,
      pendingResults: t.filter((x) => x.status !== "Published").length,
      publishedResults: t.filter((x) => x.status === "Published").length,
      openBookings: b.filter((x) => x.status === "requested" || x.status === "scheduled").length,
    };
  }),

  coaches: practitionerOnly.handler(async () => {
    const rows = await db
      .select({ id: userProfiles.userId, name: userProfiles.displayName, email: user.email, isDemo: userProfiles.isDemo })
      .from(userProfiles)
      .innerJoin(user, eq(user.id, userProfiles.userId))
      .where(eq(userProfiles.role, "coach"));
    const ids = rows.map((r) => r.id);
    const memberships = ids.length
      ? await db
          .select({ userId: teamMembers.userId, teamId: teams.id, name: teams.name })
          .from(teamMembers)
          .innerJoin(teams, eq(teams.id, teamMembers.teamId))
          .where(inArray(teamMembers.userId, ids))
      : [];
    const teamIds = [...new Set(memberships.map((m) => m.teamId))];
    const links = teamIds.length
      ? (await db.select({ teamId: teamAthletes.teamId, status: teamAthletes.status }).from(teamAthletes).where(inArray(teamAthletes.teamId, teamIds))).filter(
          (l) => l.status === "active",
        )
      : [];
    return rows.map((r) => {
      const mine = memberships.filter((m) => m.userId === r.id);
      return {
        ...r,
        teams: mine.map((m) => ({ id: m.teamId, name: m.name, athletes: links.filter((l) => l.teamId === m.teamId).length })),
      };
    });
  }),

  individuals: practitionerOnly.handler(async () => {
    const rows = await db
      .select({ id: userProfiles.userId, name: userProfiles.displayName, email: user.email })
      .from(userProfiles)
      .innerJoin(user, eq(user.id, userProfiles.userId))
      .where(eq(userProfiles.role, "individual"));
    const ids = rows.map((r) => r.id);
    const owned = ids.length ? await db.select({ id: athletes.id, userId: athletes.userId, sport: athletes.sport }).from(athletes).where(inArray(athletes.userId, ids)) : [];
    return rows.map((r) => {
      const a = owned.find((o) => o.userId === r.id);
      return { ...r, athleteId: a?.id ?? null, sport: a?.sport ?? null };
    });
  }),

  /** All athletes for the New test picker. */
  athletes: practitionerOnly.handler(async () => {
    const rows = await db.select({ id: athletes.id, name: athletes.name, position: athletes.position, sport: athletes.sport }).from(athletes);
    const links = await db
      .select({ athleteId: teamAthletes.athleteId, team: teams.name, status: teamAthletes.status })
      .from(teamAthletes)
      .innerJoin(teams, eq(teams.id, teamAthletes.teamId));
    return rows
      .map((r) => ({ ...r, teams: links.filter((l) => l.athleteId === r.id && l.status === "active").map((l) => l.team) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }),
};
