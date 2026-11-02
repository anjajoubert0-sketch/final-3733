import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../database";
import { athletes, consentLog, invites, teamAthletes, teamMembers, teams, userProfiles } from "../database/app-schema";
import { authed, coachOnly, individualOnly } from "../middleware/auth";
import { badRequest, forbidden, inviteCode, newId, ownAthlete, requireTeam, type Actor } from "../lib/access";
import { makeInvite } from "./invites";

const share = z.object({ testing: z.boolean(), training: z.boolean(), wellness: z.boolean() });
type Share = z.infer<typeof share>;

async function logConsent(teamId: string, athleteId: string, actor: Actor, action: string, before: Share | null, after: Share | null) {
  await db.insert(consentLog).values({ id: newId("cl_"), teamId, athleteId, userId: actor.id, action, before, after, at: Date.now() });
}

async function uniqueCode() {
  for (let i = 0; i < 10; i++) {
    const code = inviteCode();
    const [hit] = await db.select({ id: teams.id }).from(teams).where(eq(teams.inviteCode, code));
    if (!hit) return code;
  }
  throw badRequest("Couldn't generate an invite code, try again.");
}

async function link(teamId: string, athleteId: string) {
  const [l] = await db
    .select()
    .from(teamAthletes)
    .where(and(eq(teamAthletes.teamId, teamId), eq(teamAthletes.athleteId, athleteId)));
  return l;
}

const newAthlete = z.object({
  name: z.string().min(2).max(120),
  position: z.string().max(80).nullable().optional(),
  squadNumber: z.number().int().min(0).max(999).nullable().optional(),
});

export const teamsRouter = {
  mine: coachOnly.handler(async ({ context }) => {
    const rows = await db
      .select({ team: teams, role: teamMembers.role })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, context.actor.id));
    const ids = rows.map((r) => r.team.id);
    const links = ids.length
      ? await db
          .select({ teamId: teamAthletes.teamId })
          .from(teamAthletes)
          .where(and(inArray(teamAthletes.teamId, ids), eq(teamAthletes.status, "active")))
      : [];
    return rows.map((r) => ({
      id: r.team.id,
      name: r.team.name,
      sport: r.team.sport,
      season: r.team.season,
      inviteCode: r.team.inviteCode,
      role: r.role,
      isDemo: r.team.isDemo,
      activeAthletes: links.filter((l) => l.teamId === r.team.id).length,
    }));
  }),

  create: coachOnly
    .input(z.object({ name: z.string().min(2).max(120), sport: z.string().min(2).max(60), season: z.string().max(40).nullable().optional() }))
    .handler(async ({ input, context }) => {
      const id = newId("team_");
      await db.insert(teams).values({
        id,
        name: input.name.trim(),
        sport: input.sport.trim(),
        season: input.season?.trim() || null,
        ownerId: context.actor.id,
        inviteCode: await uniqueCode(),
      });
      await db.insert(teamMembers).values({ teamId: id, userId: context.actor.id, role: "owner" });
      if (context.actor.onboarding === "team")
        await db.update(userProfiles).set({ onboarding: "athletes" }).where(eq(userProfiles.userId, context.actor.id));
      return { id };
    }),

  update: coachOnly
    .input(z.object({ teamId: z.string(), name: z.string().min(2).max(120), sport: z.string().min(2).max(60), season: z.string().max(40).nullable().optional() }))
    .handler(async ({ input, context }) => {
      await requireTeam(context.actor, input.teamId, "manage");
      await db
        .update(teams)
        .set({ name: input.name.trim(), sport: input.sport.trim(), season: input.season?.trim() || null })
        .where(eq(teams.id, input.teamId));
      return { ok: true };
    }),

  regenerateCode: coachOnly.input(z.object({ teamId: z.string() })).handler(async ({ input, context }) => {
    await requireTeam(context.actor, input.teamId, "manage");
    const code = await uniqueCode();
    await db.update(teams).set({ inviteCode: code }).where(eq(teams.id, input.teamId));
    return { inviteCode: code };
  }),

  /** Team page: every athlete link (active and removed) with sharing status. */
  members: coachOnly.input(z.object({ teamId: z.string() })).handler(async ({ input, context }) => {
    const team = await requireTeam(context.actor, input.teamId, "manage");
    const rows = await db
      .select({ link: teamAthletes, athlete: athletes })
      .from(teamAthletes)
      .innerJoin(athletes, eq(athletes.id, teamAthletes.athleteId))
      .where(and(eq(teamAthletes.teamId, input.teamId), eq(teamAthletes.status, "active")));
    const ids = rows.map((r) => r.athlete.id);
    const pendingClaims = ids.length
      ? await db
          .select({ athleteId: invites.athleteId, expiresAt: invites.expiresAt, usedAt: invites.usedAt })
          .from(invites)
          .where(and(eq(invites.kind, "claim"), inArray(invites.athleteId, ids)))
      : [];
    return {
      team: { id: team.id, name: team.name, sport: team.sport, season: team.season, inviteCode: team.inviteCode },
      members: rows
        .map((r) => ({
          athleteId: r.athlete.id,
          name: r.athlete.name,
          position: r.athlete.position,
          squadNumber: r.link.squadNumber,
          claimed: r.athlete.userId !== null,
          consentBy: r.link.consentBy,
          share: { testing: r.link.shareTesting, training: r.link.shareTraining, wellness: r.link.shareWellness },
          claimPending: pendingClaims.some((p) => p.athleteId === r.athlete.id && !p.usedAt && p.expiresAt > Date.now()),
        }))
        .sort((x, y) => (x.squadNumber ?? 999) - (y.squadNumber ?? 999) || x.name.localeCompare(y.name)),
    };
  }),

  /** Add athletes who have no account. The coach manages them on the athlete's behalf. */
  addAthletes: coachOnly
    .input(z.object({ teamId: z.string(), athletes: z.array(newAthlete).min(1).max(80) }))
    .handler(async ({ input, context }) => {
      await requireTeam(context.actor, input.teamId, "manage");
      const ids: string[] = [];
      for (const a of input.athletes) {
        const id = newId("ath_");
        await db.insert(athletes).values({ id, name: a.name.trim(), position: a.position?.trim() || null, createdBy: context.actor.id });
        await db.insert(teamAthletes).values({
          teamId: input.teamId,
          athleteId: id,
          squadNumber: a.squadNumber ?? null,
          consentBy: "coach_on_behalf",
        });
        await logConsent(input.teamId, id, context.actor, "added_by_coach", null, { testing: true, training: true, wellness: true });
        ids.push(id);
      }
      if (context.actor.onboarding === "athletes")
        await db.update(userProfiles).set({ onboarding: "done" }).where(eq(userProfiles.userId, context.actor.id));
      return { ids };
    }),

  /** Unclaimed athletes: all fields. Claimed athletes: team fields only (position, squad number). */
  updateAthlete: coachOnly
    .input(z.object({ teamId: z.string(), athleteId: z.string(), name: z.string().min(2).max(120).optional(), position: z.string().max(80).nullable().optional(), squadNumber: z.number().int().min(0).max(999).nullable().optional() }))
    .handler(async ({ input, context }) => {
      await requireTeam(context.actor, input.teamId, "manage");
      const l = await link(input.teamId, input.athleteId);
      if (!l || l.status !== "active") throw forbidden();
      const [athlete] = await db.select().from(athletes).where(eq(athletes.id, input.athleteId));
      if (input.name !== undefined && athlete.userId) throw forbidden("This athlete manages their own profile. You can change team fields only.");
      const patch: Partial<typeof athletes.$inferInsert> = {};
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.position !== undefined) patch.position = input.position?.trim() || null;
      if (Object.keys(patch).length) await db.update(athletes).set(patch).where(eq(athletes.id, input.athleteId));
      if (input.squadNumber !== undefined)
        await db
          .update(teamAthletes)
          .set({ squadNumber: input.squadNumber })
          .where(and(eq(teamAthletes.teamId, input.teamId), eq(teamAthletes.athleteId, input.athleteId)));
      return { ok: true };
    }),

  /** Ends the team link. The passport and its data stay with the athlete. */
  removeAthlete: coachOnly.input(z.object({ teamId: z.string(), athleteId: z.string() })).handler(async ({ input, context }) => {
    await requireTeam(context.actor, input.teamId, "manage");
    const l = await link(input.teamId, input.athleteId);
    if (!l || l.status !== "active") throw forbidden();
    await db
      .update(teamAthletes)
      .set({ status: "removed", removedAt: Date.now() })
      .where(and(eq(teamAthletes.teamId, input.teamId), eq(teamAthletes.athleteId, input.athleteId)));
    await logConsent(input.teamId, input.athleteId, context.actor, "removed_by_coach", null, null);
    return { ok: true };
  }),

  /** One-time link the athlete uses to claim their existing profile. */
  claimLink: coachOnly.input(z.object({ teamId: z.string(), athleteId: z.string() })).handler(async ({ input, context }) => {
    await requireTeam(context.actor, input.teamId, "manage");
    const l = await link(input.teamId, input.athleteId);
    if (!l || l.status !== "active") throw forbidden();
    const [athlete] = await db.select().from(athletes).where(eq(athletes.id, input.athleteId));
    if (athlete.userId) throw badRequest("This athlete has already claimed their profile.");
    return makeInvite({ kind: "claim", athleteId: athlete.id, teamId: input.teamId, createdBy: context.actor.id });
  }),

  // ----- individual side -----

  myLinks: individualOnly.handler(async ({ context }) => {
    const mine = await ownAthlete(context.actor);
    if (!mine) return [];
    const rows = await db
      .select({ link: teamAthletes, team: teams })
      .from(teamAthletes)
      .innerJoin(teams, eq(teams.id, teamAthletes.teamId))
      .where(and(eq(teamAthletes.athleteId, mine.id), eq(teamAthletes.status, "active")));
    return rows.map((r) => ({
      teamId: r.team.id,
      name: r.team.name,
      sport: r.team.sport,
      squadNumber: r.link.squadNumber,
      consentBy: r.link.consentBy,
      share: { testing: r.link.shareTesting, training: r.link.shareTraining, wellness: r.link.shareWellness },
    }));
  }),

  /** Individual joins a team with the coach's code and chooses what the coach may see. */
  joinByCode: individualOnly.input(z.object({ code: z.string().min(4).max(20), share })).handler(async ({ input, context }) => {
    const mine = await ownAthlete(context.actor);
    if (!mine) throw badRequest("Create your profile first.");
    const code = input.code.trim().toUpperCase();
    const [team] = await db.select().from(teams).where(eq(teams.inviteCode, code));
    if (!team) throw badRequest("No team uses that code. Check it with your coach.");
    const existing = await link(team.id, mine.id);
    const values = {
      status: "active" as const,
      shareTesting: input.share.testing,
      shareTraining: input.share.training,
      shareWellness: input.share.wellness,
      consentBy: "athlete" as const,
      consentAt: Date.now(),
      removedAt: null,
    };
    if (existing) {
      if (existing.status === "active") throw badRequest("You're already in this team.");
      await db
        .update(teamAthletes)
        .set({ ...values, joinedAt: Date.now() })
        .where(and(eq(teamAthletes.teamId, team.id), eq(teamAthletes.athleteId, mine.id)));
    } else {
      await db.insert(teamAthletes).values({ teamId: team.id, athleteId: mine.id, ...values });
    }
    await logConsent(team.id, mine.id, context.actor, "joined", null, input.share);
    return { teamId: team.id, name: team.name };
  }),

  setSharing: individualOnly.input(z.object({ teamId: z.string(), share })).handler(async ({ input, context }) => {
    const mine = await ownAthlete(context.actor);
    if (!mine) throw forbidden();
    const l = await link(input.teamId, mine.id);
    if (!l || l.status !== "active") throw forbidden();
    const before = { testing: l.shareTesting, training: l.shareTraining, wellness: l.shareWellness };
    await db
      .update(teamAthletes)
      .set({
        shareTesting: input.share.testing,
        shareTraining: input.share.training,
        shareWellness: input.share.wellness,
        consentBy: "athlete",
        consentAt: Date.now(),
      })
      .where(and(eq(teamAthletes.teamId, input.teamId), eq(teamAthletes.athleteId, mine.id)));
    await logConsent(input.teamId, mine.id, context.actor, "sharing_changed", before, input.share);
    return { ok: true };
  }),

  /** Consent screen after claiming: confirm switches for every team link at once. */
  confirmConsent: individualOnly
    .input(z.object({ links: z.array(z.object({ teamId: z.string(), share })) }))
    .handler(async ({ input, context }) => {
      const mine = await ownAthlete(context.actor);
      if (!mine) throw forbidden();
      for (const item of input.links) {
        const l = await link(item.teamId, mine.id);
        if (!l || l.status !== "active") continue;
        await db
          .update(teamAthletes)
          .set({ shareTesting: item.share.testing, shareTraining: item.share.training, shareWellness: item.share.wellness, consentBy: "athlete", consentAt: Date.now() })
          .where(and(eq(teamAthletes.teamId, item.teamId), eq(teamAthletes.athleteId, mine.id)));
        await logConsent(item.teamId, mine.id, context.actor, "consent_confirmed", { testing: l.shareTesting, training: l.shareTraining, wellness: l.shareWellness }, item.share);
      }
      await db.update(userProfiles).set({ onboarding: "done" }).where(eq(userProfiles.userId, context.actor.id));
      return { ok: true };
    }),

  leave: individualOnly.input(z.object({ teamId: z.string() })).handler(async ({ input, context }) => {
    const mine = await ownAthlete(context.actor);
    if (!mine) throw forbidden();
    const l = await link(input.teamId, mine.id);
    if (!l || l.status !== "active") throw forbidden();
    await db
      .update(teamAthletes)
      .set({ status: "removed", removedAt: Date.now() })
      .where(and(eq(teamAthletes.teamId, input.teamId), eq(teamAthletes.athleteId, mine.id)));
    await logConsent(input.teamId, mine.id, context.actor, "left", null, null);
    return { ok: true };
  }),

  /** Consent history for a team link (coach of the team, or the athlete). */
  consentHistory: authed.input(z.object({ teamId: z.string(), athleteId: z.string() })).handler(async ({ input, context }) => {
    const mine = await ownAthlete(context.actor);
    if (!(mine && mine.id === input.athleteId)) await requireTeam(context.actor, input.teamId, "manage");
    const rows = await db
      .select()
      .from(consentLog)
      .where(and(eq(consentLog.teamId, input.teamId), eq(consentLog.athleteId, input.athleteId)));
    return rows.sort((x, y) => y.at - x.at);
  }),
};
