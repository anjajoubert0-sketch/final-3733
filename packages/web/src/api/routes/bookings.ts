import { Autumn } from "autumn-js";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../database";
import { athletes, bookings, events, payments, teamAthletes, teams, tests, userProfiles } from "../database/app-schema";
import { authed, coachOrIndividual, practitionerOnly } from "../middleware/auth";
import { badRequest, coachTeamIds, forbidden, newId, notFound, ownAthlete, requireTeam, todayIso } from "../lib/access";
import { writeAudit } from "../lib/audit";
import { getSetting } from "../lib/settings";

/** Autumn one-off product and its per-athlete-test feature (see autumn.config.ts). */
export const TEST_PLAN_ID = "physiological_test";
export const TEST_FEATURE_ID = "athlete_test";

const TEST_TYPES = ["Lactate threshold", "VO2 max", "Sweat"] as const;
const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

type BookingRow = typeof bookings.$inferSelect;

async function decorate(rows: BookingRow[]) {
  const athleteIds = [...new Set(rows.flatMap((r) => r.athleteIds))];
  const teamIds = [...new Set(rows.flatMap((r) => (r.teamId ? [r.teamId] : [])))];
  const userIds = [...new Set(rows.map((r) => r.requestedBy))];
  const names = athleteIds.length ? await db.select({ id: athletes.id, name: athletes.name }).from(athletes).where(inArray(athletes.id, athleteIds)) : [];
  const tNames = teamIds.length ? await db.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, teamIds)) : [];
  const uNames = userIds.length ? await db.select({ id: userProfiles.userId, name: userProfiles.displayName }).from(userProfiles).where(inArray(userProfiles.userId, userIds)) : [];
  return rows.map((r) => ({
    ...r,
    athleteNames: r.athleteIds.map((id) => names.find((n) => n.id === id)?.name ?? "—"),
    teamName: tNames.find((t) => t.id === r.teamId)?.name ?? null,
    requesterName: uNames.find((u) => u.id === r.requestedBy)?.name ?? "—",
    quantity: r.athleteIds.length * r.testTypes.length,
    totalCents: r.priceCentsEach === null ? null : r.priceCentsEach * r.athleteIds.length * r.testTypes.length,
  }));
}

async function load(id: string) {
  const [b] = await db.select().from(bookings).where(eq(bookings.id, id));
  if (!b) throw notFound("Booking not found.");
  return b;
}

/** Card payment marks the booking and every test made from it as paid. */
async function markPaid(b: BookingRow, method: "paid_card", reference: string, actorName: string, actorId: string) {
  await db.update(bookings).set({ paymentStatus: method }).where(eq(bookings.id, b.id));
  await db.insert(payments).values({
    id: newId("pay_"),
    bookingId: b.id,
    method: "card",
    amountCents: b.priceCentsEach === null ? null : b.priceCentsEach * b.athleteIds.length * b.testTypes.length,
    currency: b.currency,
    reference,
    verifiedBy: actorId,
  });
  const linked = await db.select().from(tests).where(eq(tests.bookingId, b.id));
  for (const t of linked) {
    if (t.paymentStatus !== "unpaid") continue;
    await db.update(tests).set({ paymentStatus: method }).where(eq(tests.id, t.id));
    await writeAudit({
      testId: t.id,
      actor: { id: actorId, name: actorName, email: "", role: null, isAdmin: false, onboarding: "done", isDemo: false },
      action: "payment: paid by card",
      before: t,
      after: { ...t, paymentStatus: method },
    });
  }
}

export const bookingsRouter = {
  /** Coach books for team athletes; Individual books for themselves. */
  create: coachOrIndividual
    .input(
      z.object({
        teamId: z.string().nullable().optional(),
        athleteIds: z.array(z.string()).min(1).max(80),
        testTypes: z.array(z.enum(TEST_TYPES)).min(1),
        preferredDates: z.array(iso).min(1).max(2),
        location: z.enum(["Vert & Dirt lab", "At our venue"]),
        phone: z.string().max(40).nullable().optional(),
        notes: z.string().max(1000).nullable().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const a = context.actor;
      let teamId: string | null = null;
      let athleteIds = [...new Set(input.athleteIds)];
      if (a.role === "coach") {
        if (!input.teamId) throw badRequest("Choose a team.");
        await requireTeam(a, input.teamId, "manage");
        const links = await db
          .select({ id: teamAthletes.athleteId })
          .from(teamAthletes)
          .where(and(eq(teamAthletes.teamId, input.teamId), eq(teamAthletes.status, "active"), inArray(teamAthletes.athleteId, athleteIds)));
        if (links.length !== athleteIds.length) throw forbidden("You can only book athletes on your team.");
        teamId = input.teamId;
      } else {
        const mine = await ownAthlete(a);
        if (!mine) throw badRequest("Create your profile first.");
        if (athleteIds.some((id) => id !== mine.id)) throw forbidden("You can only book tests for yourself.");
        athleteIds = [mine.id];
      }
      const pricing = await getSetting("pricing");
      const id = newId("bk_");
      await db.insert(bookings).values({
        id,
        requestedBy: a.id,
        requesterRole: a.role as "coach" | "individual",
        teamId,
        athleteIds,
        testTypes: input.testTypes,
        preferredDates: input.preferredDates,
        location: input.location,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
        priceCentsEach: pricing.testPriceCents,
        currency: pricing.currency,
        paymentStatus: pricing.testPriceCents ? "awaiting_card" : "not_charged",
      });
      return { id, cardCheckout: pricing.testPriceCents !== null };
    }),

  /** Coach: bookings for my teams. Individual: my own bookings. */
  mine: coachOrIndividual.handler(async ({ context }) => {
    const a = context.actor;
    let rows: BookingRow[];
    if (a.role === "coach") {
      const ids = await coachTeamIds(a);
      rows = ids.length ? await db.select().from(bookings).where(inArray(bookings.teamId, ids)).orderBy(desc(bookings.createdAt)) : [];
    } else {
      const mine = await ownAthlete(a);
      const all = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
      rows = all.filter((b) => b.requestedBy === a.id || (mine && b.athleteIds.includes(mine.id) && b.teamId === null));
    }
    return decorate(rows);
  }),

  /** Practitioner: Testing Management → Bookings. */
  list: practitionerOnly.handler(async () => decorate(await db.select().from(bookings).orderBy(desc(bookings.createdAt)))),

  schedule: practitionerOnly
    .input(z.object({ bookingId: z.string(), date: iso, time: z.string().max(10).optional() }))
    .handler(async ({ input, context }) => {
      const b = await load(input.bookingId);
      if (b.status !== "requested" && b.status !== "scheduled") throw badRequest("Only requested bookings can be scheduled.");
      await db.update(bookings).set({ status: "scheduled", scheduledFor: input.date }).where(eq(bookings.id, b.id));
      await db.delete(events).where(eq(events.bookingId, b.id));
      const title = `${b.testTypes.join(" + ")} testing`;
      if (b.teamId) {
        await db.insert(events).values({ id: newId("ev_"), teamId: b.teamId, kind: "testing", title, date: input.date, time: input.time ?? null, location: b.location, bookingId: b.id, details: {}, createdBy: context.actor.id });
      } else {
        for (const athleteId of b.athleteIds)
          await db.insert(events).values({ id: newId("ev_"), athleteId, kind: "testing", title, date: input.date, time: input.time ?? null, location: b.location, bookingId: b.id, details: {}, createdBy: context.actor.id });
      }
      return { ok: true };
    }),

  /** Test completed: creates a draft test for every athlete × test type, linked to the booking. */
  complete: practitionerOnly.input(z.object({ bookingId: z.string() })).handler(async ({ input, context }) => {
    const b = await load(input.bookingId);
    if (b.status !== "scheduled") throw badRequest("Schedule the booking first.");
    const pay: "unpaid" | "paid_card" | "verified_admin" | "waived" =
      b.paymentStatus === "paid_card" || b.paymentStatus === "verified_admin" || b.paymentStatus === "waived" ? b.paymentStatus : "unpaid";
    const created: string[] = [];
    for (const athleteId of b.athleteIds) {
      for (const type of b.testTypes as (typeof TEST_TYPES)[number][]) {
        const row = { id: newId("t_"), athleteId, type, date: b.scheduledFor ?? todayIso(), results: {}, status: "Draft" as const, bookingId: b.id, paymentStatus: pay, enteredBy: context.actor.id };
        await db.insert(tests).values(row);
        await writeAudit({ testId: row.id, actor: context.actor, action: "created from booking", before: null, after: row });
        created.push(row.id);
      }
    }
    await db.update(bookings).set({ status: "completed" }).where(eq(bookings.id, b.id));
    return { testIds: created };
  }),

  cancel: authed.input(z.object({ bookingId: z.string() })).handler(async ({ input, context }) => {
    const a = context.actor;
    const b = await load(input.bookingId);
    const staff = a.role === "practitioner" || a.isAdmin;
    if (!staff && b.requestedBy !== a.id) throw forbidden();
    if (!staff && b.status !== "requested") throw badRequest("Contact Vert & Dirt to change a scheduled booking.");
    if (b.status === "completed") throw badRequest("Completed bookings can't be cancelled.");
    await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, b.id));
    await db.delete(events).where(eq(events.bookingId, b.id));
    return { ok: true };
  }),

  /** Card checkout (only when an admin has set a price). Returns the Autumn payment URL. */
  checkout: coachOrIndividual.input(z.object({ bookingId: z.string(), returnUrl: z.string().url() })).handler(async ({ input, context }) => {
    const b = await load(input.bookingId);
    if (b.requestedBy !== context.actor.id) throw forbidden();
    if (b.priceCentsEach === null) throw badRequest("Card payment is not switched on. Vert & Dirt will confirm the price.");
    if (b.paymentStatus !== "awaiting_card") throw badRequest("This booking doesn't need card payment.");
    const autumn = new Autumn();
    try {
      await autumn.customers.getOrCreate({ customerId: context.actor.id, name: context.actor.name, email: context.actor.email });
      const res = await autumn.billing.attach({
        customerId: context.actor.id,
        planId: TEST_PLAN_ID,
        featureQuantities: [{ featureId: TEST_FEATURE_ID, quantity: b.athleteIds.length * b.testTypes.length }],
        successUrl: input.returnUrl,
        metadata: { booking_id: b.id },
      });
      return { paymentUrl: res.paymentUrl };
    } catch (e) {
      console.error("[autumn] checkout failed", e);
      throw badRequest("Card checkout is unavailable right now. Vert & Dirt can verify payment manually.");
    }
  }),

  /** After checkout: confirm with Autumn on the server before marking anything paid. */
  confirmPayment: coachOrIndividual.input(z.object({ bookingId: z.string() })).handler(async ({ input, context }) => {
    const b = await load(input.bookingId);
    if (b.requestedBy !== context.actor.id) throw forbidden();
    if (b.paymentStatus === "paid_card") return { paid: true };
    if (b.paymentStatus !== "awaiting_card") return { paid: false };
    try {
      const customer = await new Autumn().customers.getOrCreate({ customerId: context.actor.id });
      const granted = Number((customer.balances as Record<string, { granted?: number }> | undefined)?.[TEST_FEATURE_ID]?.granted ?? 0);
      // Everything this user already had confirmed + this booking must be covered by purchased units.
      const paidBefore = await db.select().from(bookings).where(and(eq(bookings.requestedBy, context.actor.id), eq(bookings.paymentStatus, "paid_card")));
      const needed = paidBefore.reduce((s, x) => s + x.athleteIds.length * x.testTypes.length, 0) + b.athleteIds.length * b.testTypes.length;
      if (granted < needed) return { paid: false };
      await markPaid(b, "paid_card", `autumn:${context.actor.id}`, context.actor.name, context.actor.id);
      return { paid: true };
    } catch (e) {
      console.error("[autumn] confirm failed", e);
      return { paid: false };
    }
  }),
};
