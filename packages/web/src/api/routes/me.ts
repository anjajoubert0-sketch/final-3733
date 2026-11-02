import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../database";
import { athletes, practitionerRequests, subscriptions, teamAthletes, teamMembers, teams, userProfiles } from "../database/app-schema";
import { authed, withUser } from "../middleware/auth";
import { badRequest, forbidden, isStaff, newId, ownAthlete, type Actor } from "../lib/access";

export const ONBOARDING_STEPS = ["role", "plan", "team", "athletes", "profile", "consent", "done"] as const;

async function teamsFor(actor: Actor) {
  if (actor.role === "coach") {
    const rows = await db
      .select({ id: teams.id, name: teams.name, sport: teams.sport, season: teams.season, inviteCode: teams.inviteCode, role: teamMembers.role })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, actor.id));
    return rows;
  }
  if (actor.role === "individual") {
    const mine = await ownAthlete(actor);
    if (!mine) return [];
    const rows = await db
      .select({ id: teams.id, name: teams.name, sport: teams.sport, season: teams.season })
      .from(teamAthletes)
      .innerJoin(teams, eq(teams.id, teamAthletes.teamId))
      .where(and(eq(teamAthletes.athleteId, mine.id), eq(teamAthletes.status, "active")));
    return rows.map((r) => ({ ...r, inviteCode: null, role: "athlete" as const }));
  }
  return [];
}

export const me = {
  /** Who am I — null when signed out. Drives every redirect in the web app. */
  get: withUser.handler(async ({ context }) => {
    const a = context.actor;
    if (!a) return null;
    const athlete = await ownAthlete(a);
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.ownerUserId, a.id));
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role,
      isAdmin: a.isAdmin,
      isStaff: isStaff(a),
      onboarding: a.onboarding,
      isDemo: a.isDemo,
      athleteId: athlete?.id ?? null,
      teams: await teamsFor(a),
      subscription: sub ? { planId: sub.planId, status: sub.status, trialEndsAt: sub.trialEndsAt } : null,
    };
  }),

  /** Public sign-up may only ever become Coach or Individual. */
  chooseRole: authed.input(z.object({ role: z.string() })).handler(async ({ input, context }) => {
    if (input.role !== "coach" && input.role !== "individual") throw forbidden("That account type can't be chosen at sign-up.");
    if (context.actor.role !== null) throw forbidden("Your account type is already set.");
    await db.update(userProfiles).set({ role: input.role, onboarding: "plan" }).where(eq(userProfiles.userId, context.actor.id));
    return { role: input.role, onboarding: "plan" };
  }),

  /** Request practitioner access: the account is locked on the waiting page until an admin approves. */
  requestPractitioner: authed
    .input(z.object({ qualification: z.string().min(2).max(200), message: z.string().max(1000).optional() }))
    .handler(async ({ input, context }) => {
      const a = context.actor;
      if (a.role !== null && a.role !== "pending_practitioner") throw forbidden("This account already has an account type.");
      await db.update(userProfiles).set({ role: "pending_practitioner", onboarding: "done" }).where(eq(userProfiles.userId, a.id));
      const [existing] = await db
        .select()
        .from(practitionerRequests)
        .where(and(eq(practitionerRequests.userId, a.id), eq(practitionerRequests.status, "pending")));
      if (!existing) {
        await db.insert(practitionerRequests).values({
          id: newId("pr_"),
          userId: a.id,
          qualification: input.qualification,
          message: input.message ?? null,
          status: "pending",
        });
      }
      return { ok: true };
    }),

  myRequest: authed.handler(async ({ context }) => {
    const rows = await db.select().from(practitionerRequests).where(eq(practitionerRequests.userId, context.actor.id));
    const latest = rows.sort((x, y) => y.createdAt - x.createdAt)[0];
    return latest ? { status: latest.status, qualification: latest.qualification, createdAt: latest.createdAt } : null;
  }),

  /** Move onboarding forward. Only forward steps relevant to the role are accepted. */
  setOnboarding: authed.input(z.object({ step: z.enum(ONBOARDING_STEPS) })).handler(async ({ input, context }) => {
    const a = context.actor;
    if (!a.role) throw forbidden("Choose an account type first.");
    if (input.step === "role") throw badRequest("Can't go back to account type.");
    const allowed: Record<string, string[]> = {
      coach: ["plan", "team", "athletes", "done"],
      individual: ["plan", "profile", "consent", "done"],
      practitioner: ["done"],
      pending_practitioner: ["done"],
    };
    if (!allowed[a.role].includes(input.step)) throw badRequest("Not a step for your account type.");
    await db.update(userProfiles).set({ onboarding: input.step }).where(eq(userProfiles.userId, a.id));
    return { onboarding: input.step };
  }),

  /** Individual: create or update the own athlete profile (one passport per person). */
  saveProfile: authed
    .input(
      z.object({
        name: z.string().min(2).max(120),
        dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        sport: z.string().max(80).nullable().optional(),
        position: z.string().max(80).nullable().optional(),
        goals: z.array(z.string().max(200)).max(10).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const a = context.actor;
      if (a.role !== "individual") throw forbidden();
      const existing = await ownAthlete(a);
      const values = {
        name: input.name.trim(),
        dob: input.dob ?? null,
        sport: input.sport?.trim() || null,
        position: input.position?.trim() || null,
        goals: input.goals ?? existing?.goals ?? [],
      };
      let id = existing?.id;
      if (existing) {
        await db.update(athletes).set(values).where(eq(athletes.id, existing.id));
      } else {
        id = newId("ath_");
        await db.insert(athletes).values({ id, ...values, userId: a.id, createdBy: a.id });
      }
      await db.update(userProfiles).set({ displayName: values.name }).where(eq(userProfiles.userId, a.id));
      if (a.onboarding === "profile") await db.update(userProfiles).set({ onboarding: "done" }).where(eq(userProfiles.userId, a.id));
      return { athleteId: id! };
    }),

  /** Individual: own athlete row (profile settings form). */
  profile: authed.handler(async ({ context }) => {
    const mine = await ownAthlete(context.actor);
    if (!mine) return null;
    return { id: mine.id, name: mine.name, dob: mine.dob, sport: mine.sport, position: mine.position, goals: mine.goals ?? [] };
  }),

  /** Coach: rename the display name. */
  rename: authed.input(z.object({ name: z.string().min(2).max(120) })).handler(async ({ input, context }) => {
    await db.update(userProfiles).set({ displayName: input.name.trim() }).where(eq(userProfiles.userId, context.actor.id));
    return { ok: true };
  }),

  /** Team ids a coach belongs to (used by the team switcher). */
  teamIds: authed.handler(async ({ context }) => {
    const rows = await teamsFor(context.actor);
    return rows.map((r) => r.id);
  }),
};

/** Shared by other routes: team rows for a set of ids. */
export async function teamNames(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const rows = await db.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}
