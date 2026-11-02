// Official testing data. Practitioners (and admins) only: every procedure is built on practitionerOnly,
// so coaches and individuals get FORBIDDEN before any handler runs.
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../database";
import { athletes, bookings, testAudit, tests } from "../database/app-schema";
import { authed, practitionerOnly } from "../middleware/auth";
import { badRequest, newId, notFound } from "../lib/access";
import { writeAudit } from "../lib/audit";
import { getSetting, setSetting } from "../lib/settings";

export const VERIFIED_PAYMENTS = ["paid_card", "verified_admin", "waived", "demo"] as const;
const EDITABLE = ["Draft", "Under review"];

const testType = z.enum(["Lactate threshold", "VO2 max", "Sweat"]);
const results = z
  .object({
    vo2: z.number().min(10).max(100).optional(),
    lt1Pace: z.number().min(120).max(900).optional(),
    lt1Hr: z.number().int().min(60).max(230).optional(),
    lt2Pace: z.number().min(120).max(900).optional(),
    lt2Hr: z.number().int().min(60).max(230).optional(),
    sweatRate: z.number().min(0).max(5).optional(),
    sodium: z.number().min(0).max(200).optional(),
  })
  .strict();
const stage = z.object({
  n: z.number().int(),
  speedKmh: z.number().min(0).max(40),
  hr: z.number().int().min(0).max(250).optional(),
  lactate: z.number().min(0).max(30).optional(),
  rpe: z.number().int().min(6).max(20).optional(),
});
const fields = z.object({
  type: testType,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  protocol: z.string().max(400).nullable().optional(),
  equipment: z.string().max(400).nullable().optional(),
  stages: z.array(stage).max(40).nullable().optional(),
  results: results.optional(),
  zonesSet: z.boolean().optional(),
  analysis: z.string().max(5000).nullable().optional(),
});

async function load(id: string) {
  const [t] = await db.select().from(tests).where(eq(tests.id, id));
  if (!t) throw notFound("Test not found.");
  return t;
}

export const testsRouter = {
  /** Testing Management list. Optional filter by status. */
  list: practitionerOnly
    .input(z.object({ status: z.enum(["pending", "published", "all"]).default("all") }))
    .handler(async ({ input }) => {
      const rows = await db.select().from(tests).orderBy(desc(tests.date));
      const filtered = rows.filter((t) =>
        input.status === "all" ? true : input.status === "published" ? t.status === "Published" : t.status !== "Published",
      );
      const ids = [...new Set(filtered.map((t) => t.athleteId))];
      const names = ids.length ? await db.select({ id: athletes.id, name: athletes.name }).from(athletes).where(inArray(athletes.id, ids)) : [];
      const nameOf = new Map(names.map((n) => [n.id, n.name]));
      return filtered.map((t) => ({
        id: t.id,
        athleteId: t.athleteId,
        athleteName: nameOf.get(t.athleteId) ?? "—",
        type: t.type,
        date: t.date,
        status: t.status,
        paymentStatus: t.paymentStatus,
        bookingId: t.bookingId,
        publishedAt: t.publishedAt,
        updatedAt: t.updatedAt,
      }));
    }),

  get: practitionerOnly.input(z.object({ testId: z.string() })).handler(async ({ input }) => {
    const t = await load(input.testId);
    const [a] = await db.select({ id: athletes.id, name: athletes.name, position: athletes.position }).from(athletes).where(eq(athletes.id, t.athleteId));
    return { test: t, athlete: a };
  }),

  create: practitionerOnly
    .input(fields.extend({ athleteId: z.string(), bookingId: z.string().nullable().optional() }))
    .handler(async ({ input, context }) => {
      const [a] = await db.select({ id: athletes.id }).from(athletes).where(eq(athletes.id, input.athleteId));
      if (!a) throw badRequest("Choose an athlete.");
      let paymentStatus: (typeof tests.$inferInsert)["paymentStatus"] = "unpaid";
      if (input.bookingId) {
        const [b] = await db.select().from(bookings).where(eq(bookings.id, input.bookingId));
        if (b?.paymentStatus === "paid_card" || b?.paymentStatus === "verified_admin" || b?.paymentStatus === "waived") paymentStatus = b.paymentStatus;
      }
      const row = {
        id: newId("t_"),
        athleteId: input.athleteId,
        type: input.type,
        date: input.date,
        protocol: input.protocol ?? null,
        equipment: input.equipment ?? null,
        stages: input.stages ?? null,
        results: input.results ?? {},
        zonesSet: input.zonesSet ?? false,
        analysis: input.analysis ?? null,
        status: "Draft" as const,
        bookingId: input.bookingId ?? null,
        paymentStatus,
        enteredBy: context.actor.id,
      };
      await db.insert(tests).values(row);
      await writeAudit({ testId: row.id, actor: context.actor, action: "created", before: null, after: row });
      return { id: row.id };
    }),

  /** Editable while Results uploaded / Under review. Later states need "Reopen for correction". */
  update: practitionerOnly.input(fields.partial().extend({ testId: z.string() })).handler(async ({ input, context }) => {
    const before = await load(input.testId);
    if (!EDITABLE.includes(before.status)) throw badRequest("Reopen this test for correction before editing it.");
    const { testId, ...patch } = input;
    const set = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await db.update(tests).set({ ...set, updatedAt: Date.now() }).where(eq(tests.id, testId));
    const after = await load(testId);
    await writeAudit({ testId, actor: context.actor, action: "edited", before, after });
    return { ok: true };
  }),

  /** Results uploaded → Under review → Analysis complete. */
  setStatus: practitionerOnly
    .input(z.object({ testId: z.string(), status: z.enum(["Under review", "Approved"]) }))
    .handler(async ({ input, context }) => {
      const before = await load(input.testId);
      const ok = (before.status === "Draft" && input.status === "Under review") || (before.status === "Under review" && input.status === "Approved");
      if (!ok) throw badRequest(`Can't move a test from ${before.status} to ${input.status}.`);
      if (input.status === "Approved" && !before.analysis?.trim()) throw badRequest("Add the practitioner analysis before marking analysis complete.");
      await db.update(tests).set({ status: input.status, updatedAt: Date.now() }).where(eq(tests.id, input.testId));
      await writeAudit({ testId: input.testId, actor: context.actor, action: input.status === "Approved" ? "analysis complete" : "submitted for review", before, after: await load(input.testId) });
      return { ok: true };
    }),

  /** Needs Analysis complete AND payment verified. Checked here, not just in the UI. */
  publish: practitionerOnly.input(z.object({ testId: z.string() })).handler(async ({ input, context }) => {
    const before = await load(input.testId);
    if (before.status !== "Approved") throw badRequest("Analysis not complete.");
    if (!(VERIFIED_PAYMENTS as readonly string[]).includes(before.paymentStatus)) throw badRequest("Payment not verified.");
    await db.update(tests).set({ status: "Published", publishedAt: Date.now(), updatedAt: Date.now() }).where(eq(tests.id, input.testId));
    await writeAudit({ testId: input.testId, actor: context.actor, action: "published", before, after: await load(input.testId) });
    return { ok: true };
  }),

  /** Correction after Analysis complete / Published. A Published test goes back to hidden. */
  reopen: practitionerOnly.input(z.object({ testId: z.string(), reason: z.string().min(3).max(500) })).handler(async ({ input, context }) => {
    const before = await load(input.testId);
    if (before.status !== "Approved" && before.status !== "Published") throw badRequest("Only completed or published tests need reopening.");
    await db.update(tests).set({ status: "Under review", publishedAt: null, updatedAt: Date.now() }).where(eq(tests.id, input.testId));
    await writeAudit({ testId: input.testId, actor: context.actor, action: "reopened for correction", before, after: await load(input.testId), reason: input.reason });
    return { ok: true };
  }),

  /** Drafts only. */
  remove: practitionerOnly.input(z.object({ testId: z.string() })).handler(async ({ input, context }) => {
    const before = await load(input.testId);
    if (before.status !== "Draft") throw badRequest("Only tests in Results uploaded (draft) can be deleted.");
    await writeAudit({ testId: input.testId, actor: context.actor, action: "deleted", before, after: null });
    await db.delete(tests).where(eq(tests.id, input.testId));
    return { ok: true };
  }),

  audit: practitionerOnly.input(z.object({ testId: z.string() })).handler(async ({ input }) => {
    const rows = await db.select().from(testAudit).where(eq(testAudit.testId, input.testId));
    return rows.sort((a, b) => b.at - a.at);
  }),

  thresholds: authed.handler(async () => getSetting("thresholds")),

  setThresholds: practitionerOnly
    .input(z.object({ vo2: z.number().min(0.1).max(10), lt2: z.number().min(1).max(60) }))
    .handler(async ({ input, context }) => {
      await setSetting("thresholds", input, context.actor.id);
      return input;
    }),
};
