import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { base } from "../__core/app";
import { auth } from "../auth";
import { db } from "../database";
import { userProfiles } from "../database/app-schema";
import type { Actor, Role } from "../lib/access";

async function loadActor(headers: Headers): Promise<Actor | null> {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;
  let [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, session.user.id));
  if (!profile) {
    // Accounts created before the profile hook existed (or managed-auth edge cases).
    [profile] = await db
      .insert(userProfiles)
      .values({ userId: session.user.id, role: null, onboarding: "role", displayName: session.user.name })
      .onConflictDoNothing()
      .returning();
    if (!profile) [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, session.user.id));
  }
  return {
    id: session.user.id,
    name: profile.displayName || session.user.name,
    email: session.user.email,
    role: (profile.role ?? null) as Role | null,
    isAdmin: profile.isAdmin,
    onboarding: profile.onboarding,
    isDemo: profile.isDemo,
  };
}

/** Optional auth — `context.actor` is null when signed out. */
export const withUser = base.use(async ({ context, next }) => {
  const actor = await loadActor(context.headers);
  return next({ context: { actor } });
});

/** Signed in (any role, including none chosen yet). */
export const authed = base.use(async ({ context, next }) => {
  const actor = await loadActor(context.headers);
  if (!actor) throw new ORPCError("UNAUTHORIZED", { message: "Please sign in." });
  return next({ context: { actor } });
});

const roleBase = (allowed: Role[], opts: { admin?: boolean } = {}) =>
  authed.use(async ({ context, next }) => {
    const a = context.actor;
    const ok = opts.admin ? a.isAdmin : (a.role !== null && allowed.includes(a.role)) || (a.isAdmin && allowed.includes("practitioner"));
    if (!ok) throw new ORPCError("FORBIDDEN", { message: "Not available for your account." });
    return next();
  });

/** Practitioners (and admins, who are always practitioners). */
export const practitionerOnly = roleBase(["practitioner"]);
export const coachOnly = roleBase(["coach"]);
export const individualOnly = roleBase(["individual"]);
export const coachOrIndividual = roleBase(["coach", "individual"]);
export const adminOnly = roleBase([], { admin: true });
