import { sqliteTable, text, integer, real, primaryKey, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// All timestamps are epoch milliseconds. All calendar dates are ISO "YYYY-MM-DD" text.
// FICTIONAL DEMO DATA is seeded by ./seed.ts.

const now = () => Date.now();

// ---------- people & access ----------

/** Role lives here, never on the auth user, so sign-up can't set it. */
export const userProfiles = sqliteTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  // coach | individual | practitioner | pending_practitioner | null (not chosen yet)
  role: text("role", { enum: ["coach", "individual", "practitioner", "pending_practitioner"] }),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  // role | plan | team | athletes | profile | consent | done
  onboarding: text("onboarding").notNull().default("role"),
  displayName: text("display_name"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().$defaultFn(now),
});

export const practitionerRequests = sqliteTable("practitioner_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  qualification: text("qualification").notNull(),
  message: text("message"),
  status: text("status", { enum: ["pending", "approved", "declined"] }).notNull().default("pending"),
  decidedBy: text("decided_by"),
  decidedAt: integer("decided_at"),
  createdAt: integer("created_at").notNull().$defaultFn(now),
});

export const invites = sqliteTable(
  "invites",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["practitioner", "claim"] }).notNull(),
    tokenHash: text("token_hash").notNull(),
    email: text("email"),
    athleteId: text("athlete_id"),
    teamId: text("team_id"),
    expiresAt: integer("expires_at").notNull(),
    usedAt: integer("used_at"),
    usedBy: text("used_by"),
    revokedAt: integer("revoked_at"),
    createdBy: text("created_by").notNull(),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("invites_token_idx").on(t.tokenHash)],
);

// ---------- teams ----------

export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    sport: text("sport").notNull(),
    season: text("season"),
    ownerId: text("owner_id").notNull(),
    inviteCode: text("invite_code").notNull(),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("teams_invite_code_idx").on(t.inviteCode)],
);

export const teamMembers = sqliteTable(
  "team_members",
  {
    teamId: text("team_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role", { enum: ["owner", "coach"] }).notNull(),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.userId] })],
);

// ---------- athletes: ONE identity per person ----------

export const athletes = sqliteTable(
  "athletes",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    sex: text("sex", { enum: ["F", "M"] }),
    dob: text("dob"),
    heightCm: real("height_cm"),
    weightKg: real("weight_kg"),
    sport: text("sport"),
    position: text("position"),
    experience: text("experience"),
    goals: text("goals", { mode: "json" }).$type<string[]>().notNull().default([]),
    // Set when an Individual account owns (or has claimed) this athlete. Unique: one account per athlete.
    userId: text("user_id"),
    createdBy: text("created_by"),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("athletes_user_idx").on(t.userId)],
);

export const teamAthletes = sqliteTable(
  "team_athletes",
  {
    teamId: text("team_id").notNull(),
    athleteId: text("athlete_id").notNull(),
    squadNumber: integer("squad_number"),
    status: text("status", { enum: ["active", "removed"] }).notNull().default("active"),
    shareTesting: integer("share_testing", { mode: "boolean" }).notNull().default(true),
    shareTraining: integer("share_training", { mode: "boolean" }).notNull().default(true),
    shareWellness: integer("share_wellness", { mode: "boolean" }).notNull().default(true),
    consentBy: text("consent_by", { enum: ["coach_on_behalf", "athlete"] }).notNull(),
    consentAt: integer("consent_at").notNull().$defaultFn(now),
    joinedAt: integer("joined_at").notNull().$defaultFn(now),
    removedAt: integer("removed_at"),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.athleteId] })],
);

export const consentLog = sqliteTable("consent_log", {
  id: text("id").primaryKey(),
  teamId: text("team_id").notNull(),
  athleteId: text("athlete_id").notNull(),
  userId: text("user_id").notNull(),
  action: text("action").notNull(),
  before: text("before", { mode: "json" }),
  after: text("after", { mode: "json" }),
  at: integer("at").notNull().$defaultFn(now),
});

// ---------- A. official testing data (practitioners only) ----------

export interface TestResults {
  vo2?: number;
  lt1Pace?: number;
  lt1Hr?: number;
  lt2Pace?: number;
  lt2Hr?: number;
  sweatRate?: number;
  sodium?: number;
}
export interface TestStage {
  n: number;
  speedKmh: number;
  hr?: number;
  lactate?: number;
  rpe?: number;
}

export const TEST_STATUSES = ["Draft", "Under review", "Approved", "Published"] as const;
export const PAYMENT_STATUSES = ["unpaid", "paid_card", "verified_admin", "waived", "demo"] as const;

export const tests = sqliteTable(
  "tests",
  {
    id: text("id").primaryKey(),
    athleteId: text("athlete_id").notNull(),
    type: text("type", { enum: ["Lactate threshold", "VO2 max", "Sweat"] }).notNull(),
    date: text("date").notNull(),
    protocol: text("protocol"),
    equipment: text("equipment"),
    stages: text("stages", { mode: "json" }).$type<TestStage[]>(),
    results: text("results", { mode: "json" }).$type<TestResults>().notNull().default({}),
    zonesSet: integer("zones_set", { mode: "boolean" }).notNull().default(false),
    analysis: text("analysis"),
    // Draft = Results uploaded · Approved = Analysis complete
    status: text("status", { enum: TEST_STATUSES }).notNull().default("Draft"),
    bookingId: text("booking_id"),
    paymentStatus: text("payment_status", { enum: PAYMENT_STATUSES }).notNull().default("unpaid"),
    enteredBy: text("entered_by"),
    publishedAt: integer("published_at"),
    createdAt: integer("created_at").notNull().$defaultFn(now),
    updatedAt: integer("updated_at").notNull().$defaultFn(now),
  },
  (t) => [index("tests_athlete_idx").on(t.athleteId)],
);

export const testAudit = sqliteTable(
  "test_audit",
  {
    id: text("id").primaryKey(),
    testId: text("test_id").notNull(),
    userId: text("user_id").notNull(),
    userName: text("user_name"),
    action: text("action").notNull(),
    before: text("before", { mode: "json" }),
    after: text("after", { mode: "json" }),
    reason: text("reason"),
    at: integer("at").notNull().$defaultFn(now),
  },
  (t) => [index("test_audit_test_idx").on(t.testId)],
);

/** Key/value settings: thresholds (practitioner), pricing + trial length (admin). */
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedBy: text("updated_by"),
  updatedAt: integer("updated_at").notNull().$defaultFn(now),
});

// ---------- booking & billing (testing revenue is separate from subscriptions) ----------

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  requestedBy: text("requested_by").notNull(),
  requesterRole: text("requester_role", { enum: ["coach", "individual"] }).notNull(),
  teamId: text("team_id"),
  athleteIds: text("athlete_ids", { mode: "json" }).$type<string[]>().notNull(),
  testTypes: text("test_types", { mode: "json" }).$type<string[]>().notNull(),
  preferredDates: text("preferred_dates", { mode: "json" }).$type<string[]>().notNull().default([]),
  location: text("location").notNull(),
  phone: text("phone"),
  notes: text("notes"),
  status: text("status", { enum: ["requested", "scheduled", "completed", "cancelled"] }).notNull().default("requested"),
  scheduledFor: text("scheduled_for"),
  // Price per athlete per test at the time of booking; null = to be confirmed.
  priceCentsEach: integer("price_cents_each"),
  currency: text("currency").notNull().default("ZAR"),
  paymentStatus: text("payment_status", { enum: ["not_charged", "awaiting_card", "paid_card", "verified_admin", "waived"] })
    .notNull()
    .default("not_charged"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().$defaultFn(now),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id"),
  testId: text("test_id"),
  method: text("method", { enum: ["card", "admin", "waived", "demo"] }).notNull(),
  amountCents: integer("amount_cents"),
  currency: text("currency").notNull().default("ZAR"),
  reference: text("reference"),
  reason: text("reason"),
  verifiedBy: text("verified_by"),
  verifiedAt: integer("verified_at").notNull().$defaultFn(now),
});

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  audience: text("audience", { enum: ["coach", "team", "individual", "enterprise"] }).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  // null = "to be confirmed". Monthly base fee + monthly fee per active athlete.
  baseFeeCents: integer("base_fee_cents"),
  perAthleteFeeCents: integer("per_athlete_fee_cents"),
  currency: text("currency").notNull().default("ZAR"),
  contactOnly: integer("contact_only", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  planId: text("plan_id").notNull(),
  status: text("status", { enum: ["trial", "active", "cancelled"] }).notNull().default("trial"),
  trialStartedAt: integer("trial_started_at").notNull().$defaultFn(now),
  trialEndsAt: integer("trial_ends_at"),
  createdAt: integer("created_at").notNull().$defaultFn(now),
});

// ---------- B. training & management data (coaches within consent, individuals for themselves) ----------

export const trainingSessions = sqliteTable(
  "training_sessions",
  {
    id: text("id").primaryKey(),
    athleteId: text("athlete_id").notNull(),
    date: text("date").notNull(),
    type: text("type").notNull(),
    durationMin: integer("duration_min").notNull(),
    rpe: integer("rpe").notNull(),
    notes: text("notes"),
    // manual today; garmin / strava / … later, with external_id for de-duplication.
    source: text("source").notNull().default("manual"),
    externalId: text("external_id"),
    enteredBy: text("entered_by").notNull(),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("training_athlete_idx").on(t.athleteId, t.date)],
);

export const recoveryCheckins = sqliteTable(
  "recovery_checkins",
  {
    id: text("id").primaryKey(),
    athleteId: text("athlete_id").notNull(),
    date: text("date").notNull(),
    sleep: integer("sleep").notNull(),
    soreness: integer("soreness").notNull(),
    fatigue: integer("fatigue").notNull(),
    stress: integer("stress").notNull(),
    notes: text("notes"),
    enteredBy: text("entered_by").notNull(),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("checkins_athlete_idx").on(t.athleteId, t.date)],
);

/** Coach-entered, team-scoped assessments. Never derived from test values. */
export const coachAssessments = sqliteTable(
  "coach_assessments",
  {
    teamId: text("team_id").notNull(),
    athleteId: text("athlete_id").notNull(),
    restStatus: text("rest_status").notNull().default("Grey"),
    restNote: text("rest_note"),
    restOn: text("rest_on"),
    peakStatus: text("peak_status").notNull().default("Insufficient data"),
    peakNote: text("peak_note"),
    peakOn: text("peak_on"),
    updatedBy: text("updated_by"),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.athleteId] })],
);

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    // Exactly one of team_id / athlete_id: team events vs personal events.
    teamId: text("team_id"),
    athleteId: text("athlete_id"),
    kind: text("kind", { enum: ["match", "testing", "training", "competition", "other"] }).notNull(),
    title: text("title").notNull(),
    date: text("date").notNull(),
    time: text("time"),
    location: text("location"),
    details: text("details", { mode: "json" }).$type<Record<string, string | number | boolean | null>>().notNull().default({}),
    bookingId: text("booking_id"),
    createdBy: text("created_by").notNull(),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("events_team_idx").on(t.teamId, t.date), index("events_athlete_idx").on(t.athleteId, t.date)],
);

export const matchParticipation = sqliteTable(
  "match_participation",
  {
    eventId: text("event_id").notNull(),
    athleteId: text("athlete_id").notNull(),
    minutes: integer("minutes").notNull(),
    enteredBy: text("entered_by").notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.athleteId] })],
);
