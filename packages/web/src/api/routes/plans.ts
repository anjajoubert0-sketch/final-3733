// Subscriptions: trial only for now. Prices live in the plans table ("to be confirmed" when null).
// Testing is billed separately (bookings) and never bundled into a subscription.
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { base } from "../__core/app";
import { db } from "../database";
import { plans, subscriptions, teamAthletes, teamMembers, userProfiles } from "../database/app-schema";
import { authed, coachOrIndividual } from "../middleware/auth";
import { badRequest, forbidden, newId, ownAthlete } from "../lib/access";
import { getSetting } from "../lib/settings";

const AUDIENCE: Record<string, string[]> = { coach: ["coach", "team", "enterprise"], individual: ["individual", "enterprise"] };

export const plansRouter = {
  list: base.handler(async () => db.select().from(plans).where(eq(plans.active, true)).orderBy(plans.sort)),

  /** Public pricing for the booking form and plan cards. */
  pricing: base.handler(async () => {
    const p = await getSetting("pricing");
    const t = await getSetting("trial");
    return { testPriceCents: p.testPriceCents, currency: p.currency, trialDays: t.trialDays, cardCheckout: p.testPriceCents !== null };
  }),

  /** Choosing a plan starts a trial. Nothing is charged and no card is asked for. */
  choose: coachOrIndividual.input(z.object({ planId: z.string() })).handler(async ({ input, context }) => {
    const a = context.actor;
    const [plan] = await db.select().from(plans).where(eq(plans.id, input.planId));
    if (!plan || !plan.active) throw badRequest("Choose a plan.");
    if (plan.contactOnly) throw badRequest("Enterprise is arranged with Vert & Dirt directly.");
    if (!AUDIENCE[a.role!].includes(plan.audience)) throw forbidden("That plan isn't for your account type.");
    const trial = await getSetting("trial");
    const ends = trial.trialDays ? Date.now() + trial.trialDays * 86400000 : null;
    const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.ownerUserId, a.id));
    if (existing) {
      await db.update(subscriptions).set({ planId: plan.id }).where(eq(subscriptions.id, existing.id));
    } else {
      await db.insert(subscriptions).values({ id: newId("sub_"), ownerUserId: a.id, planId: plan.id, status: "trial", trialEndsAt: ends });
    }
    if (a.onboarding === "plan") {
      const next = a.role === "coach" ? "team" : "profile";
      await db.update(userProfiles).set({ onboarding: next }).where(eq(userProfiles.userId, a.id));
      return { next };
    }
    return { next: "done" };
  }),

  /** Billing card: plan, trial status and the active athlete count. */
  mine: authed.handler(async ({ context }) => {
    const a = context.actor;
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.ownerUserId, a.id));
    if (!sub) return null;
    const [plan] = await db.select().from(plans).where(eq(plans.id, sub.planId));
    let activeAthletes = 0;
    if (a.role === "coach") {
      const teamIds = (await db.select({ id: teamMembers.teamId }).from(teamMembers).where(eq(teamMembers.userId, a.id))).map((r) => r.id);
      if (teamIds.length) {
        const rows = await db
          .select({ id: teamAthletes.athleteId })
          .from(teamAthletes)
          .where(and(inArray(teamAthletes.teamId, teamIds), eq(teamAthletes.status, "active")));
        activeAthletes = new Set(rows.map((r) => r.id)).size;
      }
    } else if (a.role === "individual") {
      activeAthletes = (await ownAthlete(a)) ? 1 : 0;
    }
    return { subscription: sub, plan, activeAthletes };
  }),
};
