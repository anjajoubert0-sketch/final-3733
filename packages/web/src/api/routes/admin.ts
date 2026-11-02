// Admin only (Vert & Dirt personnel): practitioner approvals, invites, manual payment verification, pricing, demo reset.
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../database";
import { user } from "../database/auth-schema";
import { athletes, bookings, invites, payments, plans, practitionerRequests, tests, userProfiles } from "../database/app-schema";
import { adminOnly } from "../middleware/auth";
import { badRequest, newId, notFound } from "../lib/access";
import { writeAudit } from "../lib/audit";
import { getSetting, setSetting } from "../lib/settings";
import { makeInvite } from "./invites";

const PAYMENT_METHOD = z.enum(["verified_admin", "waived"]);

export const adminRouter = {
  requests: adminOnly.handler(async () => {
    const rows = await db.select().from(practitionerRequests).orderBy(desc(practitionerRequests.createdAt));
    const ids = rows.map((r) => r.userId);
    const users = ids.length ? await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(inArray(user.id, ids)) : [];
    return rows.map((r) => ({ ...r, name: users.find((u) => u.id === r.userId)?.name ?? "—", email: users.find((u) => u.id === r.userId)?.email ?? "—" }));
  }),

  decideRequest: adminOnly.input(z.object({ requestId: z.string(), approve: z.boolean() })).handler(async ({ input, context }) => {
    const [r] = await db.select().from(practitionerRequests).where(eq(practitionerRequests.id, input.requestId));
    if (!r) throw notFound();
    if (r.status !== "pending") throw badRequest("This request has already been decided.");
    await db
      .update(practitionerRequests)
      .set({ status: input.approve ? "approved" : "declined", decidedBy: context.actor.id, decidedAt: Date.now() })
      .where(eq(practitionerRequests.id, r.id));
    if (input.approve) await db.update(userProfiles).set({ role: "practitioner", onboarding: "done" }).where(eq(userProfiles.userId, r.userId));
    return { ok: true };
  }),

  invitePractitioner: adminOnly.input(z.object({ email: z.string().email() })).handler(async ({ input, context }) =>
    makeInvite({ kind: "practitioner", email: input.email, createdBy: context.actor.id }),
  ),

  invites: adminOnly.handler(async () => {
    const rows = await db.select().from(invites).where(eq(invites.kind, "practitioner")).orderBy(desc(invites.createdAt));
    return rows.map((r) => ({ id: r.id, email: r.email, expiresAt: r.expiresAt, usedAt: r.usedAt, revokedAt: r.revokedAt, createdAt: r.createdAt }));
  }),

  revokeInvite: adminOnly.input(z.object({ inviteId: z.string() })).handler(async ({ input }) => {
    await db.update(invites).set({ revokedAt: Date.now() }).where(eq(invites.id, input.inviteId));
    return { ok: true };
  }),

  /** Unpaid tests and bookings waiting for verification. */
  payments: adminOnly.handler(async () => {
    const unpaidTests = await db.select().from(tests).where(eq(tests.paymentStatus, "unpaid")).orderBy(desc(tests.date));
    const openBookings = (await db.select().from(bookings).orderBy(desc(bookings.createdAt))).filter(
      (b) => b.status !== "cancelled" && (b.paymentStatus === "not_charged" || b.paymentStatus === "awaiting_card"),
    );
    const ids = [...new Set([...unpaidTests.map((t) => t.athleteId), ...openBookings.flatMap((b) => b.athleteIds)])];
    const names = ids.length ? await db.select({ id: athletes.id, name: athletes.name }).from(athletes).where(inArray(athletes.id, ids)) : [];
    const nameOf = (id: string) => names.find((n) => n.id === id)?.name ?? "—";
    const history = await db.select().from(payments).orderBy(desc(payments.verifiedAt)).limit(30);
    return {
      tests: unpaidTests.map((t) => ({ id: t.id, athleteName: nameOf(t.athleteId), type: t.type, date: t.date, status: t.status, bookingId: t.bookingId })),
      bookings: openBookings.map((b) => ({
        id: b.id,
        athleteNames: b.athleteIds.map(nameOf),
        testTypes: b.testTypes,
        status: b.status,
        paymentStatus: b.paymentStatus,
        quantity: b.athleteIds.length * b.testTypes.length,
        priceCentsEach: b.priceCentsEach,
      })),
      history,
    };
  }),

  /** Manual verification (EFT, cash, demo) or a waiver. Reason required and logged. */
  verifyPayment: adminOnly
    .input(z.object({ testId: z.string().optional(), bookingId: z.string().optional(), method: PAYMENT_METHOD, reason: z.string().min(3).max(500) }))
    .handler(async ({ input, context }) => {
      if (!input.testId === !input.bookingId) throw badRequest("Choose one test or one booking.");
      const targets: (typeof tests.$inferSelect)[] = [];
      let amountCents: number | null = null;
      if (input.bookingId) {
        const [b] = await db.select().from(bookings).where(eq(bookings.id, input.bookingId));
        if (!b) throw notFound("Booking not found.");
        await db.update(bookings).set({ paymentStatus: input.method }).where(eq(bookings.id, b.id));
        amountCents = b.priceCentsEach === null ? null : b.priceCentsEach * b.athleteIds.length * b.testTypes.length;
        targets.push(...(await db.select().from(tests).where(eq(tests.bookingId, b.id))));
      } else {
        const [t] = await db.select().from(tests).where(eq(tests.id, input.testId!));
        if (!t) throw notFound("Test not found.");
        targets.push(t);
      }
      await db.insert(payments).values({
        id: newId("pay_"),
        bookingId: input.bookingId ?? null,
        testId: input.testId ?? null,
        method: input.method === "waived" ? "waived" : "admin",
        amountCents,
        reason: input.reason,
        verifiedBy: context.actor.id,
      });
      for (const t of targets) {
        await db.update(tests).set({ paymentStatus: input.method, updatedAt: Date.now() }).where(eq(tests.id, t.id));
        await writeAudit({
          testId: t.id,
          actor: context.actor,
          action: input.method === "waived" ? "payment waived" : "payment verified by admin",
          before: t,
          after: { ...t, paymentStatus: input.method },
          reason: input.reason,
        });
      }
      return { ok: true, tests: targets.length };
    }),

  pricing: adminOnly.handler(async () => ({
    pricing: await getSetting("pricing"),
    trial: await getSetting("trial"),
    plans: await db.select().from(plans).orderBy(plans.sort),
  })),

  setPricing: adminOnly
    .input(z.object({ testPriceCents: z.number().int().min(0).max(10_000_000).nullable(), trialDays: z.number().int().min(1).max(365).nullable() }))
    .handler(async ({ input, context }) => {
      const pricing = await getSetting("pricing");
      await setSetting("pricing", { ...pricing, testPriceCents: input.testPriceCents || null }, context.actor.id);
      await setSetting("trial", { trialDays: input.trialDays }, context.actor.id);
      return { ok: true };
    }),

  setPlanFees: adminOnly
    .input(z.object({ planId: z.string(), baseFeeCents: z.number().int().min(0).nullable(), perAthleteFeeCents: z.number().int().min(0).nullable() }))
    .handler(async ({ input }) => {
      await db.update(plans).set({ baseFeeCents: input.baseFeeCents, perAthleteFeeCents: input.perAthleteFeeCents }).where(eq(plans.id, input.planId));
      return { ok: true };
    }),

  /** Re-seeds the fictional demo data relative to today. Real accounts and teams are untouched. */
  resetDemo: adminOnly.handler(async () => {
    const { seedDemo } = await import("../database/seed");
    await seedDemo();
    return { ok: true };
  }),
};
