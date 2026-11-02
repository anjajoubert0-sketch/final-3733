import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { base } from "../__core/app";
import { db } from "../database";
import { athletes, consentLog, invites, teamAthletes, teams, userProfiles } from "../database/app-schema";
import { authed } from "../middleware/auth";
import { badRequest, forbidden, newId, ownAthlete, randomToken, sha256 } from "../lib/access";

async function findInvite(token: string) {
  const [row] = await db.select().from(invites).where(eq(invites.tokenHash, await sha256(token)));
  return row;
}

function invalidReason(row: typeof invites.$inferSelect | undefined) {
  if (!row) return "This link isn't valid.";
  if (row.revokedAt) return "This link has been cancelled.";
  if (row.usedAt) return "This link has already been used.";
  if (row.expiresAt < Date.now()) return "This link has expired.";
  return null;
}

export const invitesRouter = {
  /** Public: what does this link do? (Safe: reveals only the invited email / athlete first name.) */
  preview: base.input(z.object({ token: z.string().min(10) })).handler(async ({ input }) => {
    const row = await findInvite(input.token);
    const reason = invalidReason(row);
    if (!row || reason) return { valid: false as const, reason: reason ?? "This link isn't valid." };
    let athleteName: string | null = null;
    let teamName: string | null = null;
    if (row.athleteId) {
      const [a] = await db.select({ name: athletes.name }).from(athletes).where(eq(athletes.id, row.athleteId));
      athleteName = a?.name ?? null;
    }
    if (row.teamId) {
      const [t] = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, row.teamId));
      teamName = t?.name ?? null;
    }
    return { valid: true as const, kind: row.kind, email: row.email, athleteName, teamName, expiresAt: row.expiresAt };
  }),

  /** Signed in: use the link. Each link works exactly once. */
  accept: authed.input(z.object({ token: z.string().min(10) })).handler(async ({ input, context }) => {
    const a = context.actor;
    const row = await findInvite(input.token);
    const reason = invalidReason(row);
    if (!row || reason) throw badRequest(reason ?? "This link isn't valid.");

    if (row.kind === "practitioner") {
      if (row.email && row.email.toLowerCase() !== a.email.toLowerCase())
        throw forbidden(`This invite is for ${row.email}. Sign in with that email.`);
      if (a.role !== null && a.role !== "pending_practitioner" && a.role !== "practitioner")
        throw forbidden("This account already has another account type. Use a new account for practitioner access.");
      // Claim the link atomically first so a double-submit can't use it twice.
      const claimed = await db
        .update(invites)
        .set({ usedAt: Date.now(), usedBy: a.id })
        .where(and(eq(invites.id, row.id), isNull(invites.usedAt)))
        .returning();
      if (!claimed.length) throw badRequest("This link has already been used.");
      await db.update(userProfiles).set({ role: "practitioner", onboarding: "done" }).where(eq(userProfiles.userId, a.id));
      return { kind: "practitioner" as const, next: "/practitioner" };
    }

    // Athlete claim: link this account to the existing athlete row (no duplicate passport).
    if (a.role !== null && a.role !== "individual") throw forbidden("Profiles can only be claimed by an Individual account.");
    if (await ownAthlete(a)) throw forbidden("This account already has a passport. Join the team with its invite code instead.");
    const [athlete] = await db.select().from(athletes).where(eq(athletes.id, row.athleteId!));
    if (!athlete) throw badRequest("This profile no longer exists.");
    if (athlete.userId) throw badRequest("This profile has already been claimed.");
    const used = await db
      .update(invites)
      .set({ usedAt: Date.now(), usedBy: a.id })
      .where(and(eq(invites.id, row.id), isNull(invites.usedAt)))
      .returning();
    if (!used.length) throw badRequest("This link has already been used.");
    await db.update(athletes).set({ userId: a.id }).where(eq(athletes.id, athlete.id));
    await db
      .update(userProfiles)
      .set({ role: "individual", onboarding: "consent", displayName: athlete.name })
      .where(eq(userProfiles.userId, a.id));
    if (row.teamId) {
      await db.insert(consentLog).values({
        id: newId("cl_"),
        teamId: row.teamId,
        athleteId: athlete.id,
        userId: a.id,
        action: "claimed",
        before: null,
        after: null,
        at: Date.now(),
      });
    }
    const links = await db.select().from(teamAthletes).where(eq(teamAthletes.athleteId, athlete.id));
    return { kind: "claim" as const, next: links.length ? "/onboarding/consent" : "/me", athleteId: athlete.id };
  }),
};

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Creates a one-time link token (only its hash is stored). */
export async function makeInvite(opts: { kind: "practitioner" | "claim"; email?: string | null; athleteId?: string; teamId?: string; createdBy: string }) {
  const token = randomToken();
  const expiresAt = Date.now() + WEEK;
  await db.insert(invites).values({
    id: newId("inv_"),
    kind: opts.kind,
    tokenHash: await sha256(token),
    email: opts.email?.toLowerCase() ?? null,
    athleteId: opts.athleteId ?? null,
    teamId: opts.teamId ?? null,
    expiresAt,
    createdBy: opts.createdBy,
  });
  return { token, path: `/invite/${token}`, expiresAt };
}
