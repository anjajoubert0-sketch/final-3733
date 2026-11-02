// The ONE server-side permission layer. Every route that touches athlete, team or test data
// goes through these helpers; the browser never talks to the database directly.
import { ORPCError } from "@orpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../database";
import { athletes, teamAthletes, teamMembers, teams } from "../database/app-schema";

export type Role = "coach" | "individual" | "practitioner" | "pending_practitioner";

export interface Actor {
  id: string;
  name: string;
  email: string;
  role: Role | null;
  isAdmin: boolean;
  onboarding: string;
  isDemo: boolean;
}

export type Category = "testing" | "training" | "wellness";

export const forbidden = (message = "Not available for your account.") => new ORPCError("FORBIDDEN", { message });
export const notFound = (message = "Not found.") => new ORPCError("NOT_FOUND", { message });
export const badRequest = (message: string) => new ORPCError("BAD_REQUEST", { message });

/** Practitioners and admins can see everything, including unpublished results. */
export const isStaff = (a: Actor) => a.role === "practitioner" || a.isAdmin;

export function requireStaff(a: Actor) {
  if (!isStaff(a)) throw forbidden("Practitioners only.");
}

/** Team ids the actor coaches. */
export async function coachTeamIds(a: Actor): Promise<string[]> {
  if (a.role !== "coach") return [];
  const rows = await db.select({ teamId: teamMembers.teamId }).from(teamMembers).where(eq(teamMembers.userId, a.id));
  return rows.map((r) => r.teamId);
}

/** Coach must be a member of the team; staff may view any team. */
export async function requireTeam(a: Actor, teamId: string, mode: "view" | "manage" = "view") {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) throw forbidden();
  if (isStaff(a) && mode === "view") return team;
  if (a.role !== "coach") throw forbidden();
  const [m] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, a.id)));
  if (!m) throw forbidden();
  return team;
}

/** The athlete row owned by an Individual account, if any. */
export async function ownAthlete(a: Actor) {
  if (a.role !== "individual") return undefined;
  const [row] = await db.select().from(athletes).where(eq(athletes.userId, a.id));
  return row;
}

export interface AthleteAccess {
  kind: "staff" | "self" | "coach";
  athlete: typeof athletes.$inferSelect;
  view: Record<Category, boolean>;
  edit: Record<Category, boolean>; // testing edit is staff-only and handled in tests routes
  canEditProfile: boolean; // full profile (name, dob, goals…)
  coachTeamIds: string[]; // teams through which a coach reaches this athlete
  /** Only published results may be returned to this viewer. */
  publishedOnly: boolean;
}

const none: Record<Category, boolean> = { testing: false, training: false, wellness: false };

export async function athleteAccess(a: Actor, athleteId: string): Promise<AthleteAccess> {
  const [athlete] = await db.select().from(athletes).where(eq(athletes.id, athleteId));
  if (!athlete) throw forbidden(); // same error as "not yours" so ids can't be probed
  if (isStaff(a)) {
    return {
      kind: "staff",
      athlete,
      view: { testing: true, training: true, wellness: true },
      edit: { ...none },
      canEditProfile: true,
      coachTeamIds: [],
      publishedOnly: false,
    };
  }
  if (a.role === "individual" && athlete.userId === a.id) {
    return {
      kind: "self",
      athlete,
      view: { testing: true, training: true, wellness: true },
      edit: { testing: false, training: true, wellness: true },
      canEditProfile: true,
      coachTeamIds: [],
      publishedOnly: true,
    };
  }
  if (a.role === "coach") {
    const myTeams = await coachTeamIds(a);
    if (myTeams.length) {
      const links = await db
        .select()
        .from(teamAthletes)
        .where(and(eq(teamAthletes.athleteId, athleteId), eq(teamAthletes.status, "active"), inArray(teamAthletes.teamId, myTeams)));
      if (links.length) {
        const view = {
          testing: links.some((l) => l.shareTesting),
          training: links.some((l) => l.shareTraining),
          wellness: links.some((l) => l.shareWellness),
        };
        return {
          kind: "coach",
          athlete,
          view,
          edit: { testing: false, training: view.training, wellness: view.wellness },
          canEditProfile: athlete.userId === null, // unclaimed: coach manages on the athlete's behalf
          coachTeamIds: links.map((l) => l.teamId),
          publishedOnly: true,
        };
      }
    }
  }
  throw forbidden();
}

export async function requireAthlete(a: Actor, athleteId: string, category: Category, mode: "view" | "edit") {
  const acc = await athleteAccess(a, athleteId);
  const ok = mode === "view" ? acc.view[category] : acc.edit[category];
  if (!ok) throw forbidden(mode === "view" ? "The athlete hasn't shared this with you." : "You can't change this.");
  return acc;
}

export function newId(prefix = "") {
  return `${prefix}${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 24) {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = crypto.getRandomValues(new Uint8Array(8));
  const s = [...arr].map((b) => alphabet[b % alphabet.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
