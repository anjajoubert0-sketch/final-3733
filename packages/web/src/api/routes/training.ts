// B. Training and management data. Coaches: their athletes, within consent. Individuals: themselves.
// Practitioners and admins: view only.
import { and, desc, eq, gte, inArray, isNotNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../database";
import { bookings, events, recoveryCheckins, teamAthletes, trainingSessions } from "../database/app-schema";
import { authed, individualOnly } from "../middleware/auth";
import { forbidden, newId, notFound, ownAthlete, requireAthlete } from "../lib/access";

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const session = z.object({
  date: iso,
  type: z.string().min(2).max(60),
  durationMin: z.number().int().min(1).max(600),
  rpe: z.number().int().min(1).max(10),
  notes: z.string().max(1000).nullable().optional(),
});
const checkin = z.object({
  date: iso,
  sleep: z.number().int().min(1).max(5),
  soreness: z.number().int().min(1).max(5),
  fatigue: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  notes: z.string().max(500).nullable().optional(),
});

async function sessionRow(id: string) {
  const [s] = await db.select().from(trainingSessions).where(eq(trainingSessions.id, id));
  if (!s) throw notFound();
  return s;
}

export const trainingRouter = {
  sessions: authed.input(z.object({ athleteId: z.string() })).handler(async ({ input, context }) => {
    const acc = await requireAthlete(context.actor, input.athleteId, "training", "view");
    const rows = await db.select().from(trainingSessions).where(eq(trainingSessions.athleteId, input.athleteId)).orderBy(desc(trainingSessions.date));
    return { canEdit: acc.edit.training, rows };
  }),

  createSession: authed.input(session.extend({ athleteId: z.string() })).handler(async ({ input, context }) => {
    await requireAthlete(context.actor, input.athleteId, "training", "edit");
    const id = newId("ts_");
    await db.insert(trainingSessions).values({ id, ...input, notes: input.notes ?? null, source: "manual", enteredBy: context.actor.id });
    return { id };
  }),

  updateSession: authed.input(session.partial().extend({ sessionId: z.string() })).handler(async ({ input, context }) => {
    const s = await sessionRow(input.sessionId);
    await requireAthlete(context.actor, s.athleteId, "training", "edit");
    if (s.source !== "manual") throw forbidden("Synced sessions are edited in their source app.");
    const { sessionId, ...patch } = input;
    await db.update(trainingSessions).set(Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))).where(eq(trainingSessions.id, sessionId));
    return { ok: true };
  }),

  removeSession: authed.input(z.object({ sessionId: z.string() })).handler(async ({ input, context }) => {
    const s = await sessionRow(input.sessionId);
    await requireAthlete(context.actor, s.athleteId, "training", "edit");
    await db.delete(trainingSessions).where(eq(trainingSessions.id, s.id));
    return { ok: true };
  }),

  checkins: authed.input(z.object({ athleteId: z.string() })).handler(async ({ input, context }) => {
    const acc = await requireAthlete(context.actor, input.athleteId, "wellness", "view");
    const rows = await db.select().from(recoveryCheckins).where(eq(recoveryCheckins.athleteId, input.athleteId)).orderBy(desc(recoveryCheckins.date));
    return { canEdit: acc.edit.wellness, rows };
  }),

  /** One check-in per athlete per day: saving again replaces that day's entry. */
  saveCheckin: authed.input(checkin.extend({ athleteId: z.string() })).handler(async ({ input, context }) => {
    await requireAthlete(context.actor, input.athleteId, "wellness", "edit");
    await db.delete(recoveryCheckins).where(and(eq(recoveryCheckins.athleteId, input.athleteId), eq(recoveryCheckins.date, input.date)));
    const id = newId("rc_");
    await db.insert(recoveryCheckins).values({ id, ...input, notes: input.notes ?? null, enteredBy: context.actor.id });
    return { id };
  }),

  removeCheckin: authed.input(z.object({ checkinId: z.string() })).handler(async ({ input, context }) => {
    const [c] = await db.select().from(recoveryCheckins).where(eq(recoveryCheckins.id, input.checkinId));
    if (!c) throw notFound();
    await requireAthlete(context.actor, c.athleteId, "wellness", "edit");
    await db.delete(recoveryCheckins).where(eq(recoveryCheckins.id, c.id));
    return { ok: true };
  }),

  /** Individual calendar: personal events, own scheduled tests, and fixtures of teams I belong to. */
  myCalendar: individualOnly.handler(async ({ context }) => {
    const mine = await ownAthlete(context.actor);
    if (!mine) return [];
    const links = await db
      .select({ teamId: teamAthletes.teamId })
      .from(teamAthletes)
      .where(and(eq(teamAthletes.athleteId, mine.id), eq(teamAthletes.status, "active")));
    const teamIds = links.map((l) => l.teamId);
    const since = new Date(Date.now() - 62 * 86400000).toISOString().slice(0, 10);
    const rows = await db
      .select()
      .from(events)
      .where(
        and(
          gte(events.date, since),
          or(
            eq(events.athleteId, mine.id),
            teamIds.length ? and(inArray(events.teamId, teamIds), eq(events.kind, "match")) : undefined,
            // A scheduled team testing session that includes me.
            teamIds.length ? and(inArray(events.teamId, teamIds), isNotNull(events.bookingId)) : undefined,
          ),
        ),
      );
    const bookingIds = [...new Set(rows.flatMap((e) => (e.bookingId && e.teamId ? [e.bookingId] : [])))];
    const bk = bookingIds.length ? await db.select({ id: bookings.id, athleteIds: bookings.athleteIds }).from(bookings).where(inArray(bookings.id, bookingIds)) : [];
    return rows
      .filter((e) => !(e.teamId && e.bookingId) || bk.find((b) => b.id === e.bookingId)?.athleteIds.includes(mine.id))
      .map((e) => ({ id: e.id, kind: e.kind, title: e.title, date: e.date, time: e.time, location: e.location, personal: e.athleteId === mine.id && !e.bookingId }))
      .sort((a, b) => (a.date === b.date ? (a.time ?? "").localeCompare(b.time ?? "") : a.date < b.date ? -1 : 1));
  }),

  addPersonalEvent: individualOnly
    .input(z.object({ title: z.string().min(2).max(120), date: iso, time: z.string().max(5).nullable().optional(), kind: z.enum(["training", "competition", "other"]), location: z.string().max(120).nullable().optional() }))
    .handler(async ({ input, context }) => {
      const mine = await ownAthlete(context.actor);
      if (!mine) throw forbidden("Create your profile first.");
      const id = newId("ev_");
      await db.insert(events).values({ id, athleteId: mine.id, kind: input.kind, title: input.title, date: input.date, time: input.time ?? null, location: input.location ?? null, details: {}, createdBy: context.actor.id });
      return { id };
    }),

  removePersonalEvent: individualOnly.input(z.object({ eventId: z.string() })).handler(async ({ input, context }) => {
    const mine = await ownAthlete(context.actor);
    const [e] = await db.select().from(events).where(eq(events.id, input.eventId));
    if (!e || !mine || e.athleteId !== mine.id || e.bookingId) throw forbidden();
    await db.delete(events).where(eq(events.id, e.id));
    return { ok: true };
  }),
};
