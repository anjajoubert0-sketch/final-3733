import type { Me } from "../queries/me";

export type AppRole = "coach" | "individual" | "practitioner" | "admin";

export const ROLE_LABEL: Record<string, string> = {
  coach: "Coach",
  individual: "Individual",
  practitioner: "Practitioner",
  pending_practitioner: "Pending approval",
};

export function roleLabel(me: Pick<Me, "role" | "isAdmin">) {
  if (me.isAdmin) return "Practitioner · Admin";
  return me.role ? (ROLE_LABEL[me.role] ?? me.role) : "No account type yet";
}

/** Where a fully onboarded account lands after login. */
export function homeFor(me: Pick<Me, "role" | "isAdmin">) {
  if (me.role === "pending_practitioner") return "/pending-approval";
  if (me.role === "practitioner" || me.isAdmin) return "/practitioner";
  if (me.role === "individual") return "/me";
  if (me.role === "coach") return "/";
  return "/sign-up";
}

/** Route for an unfinished onboarding step, or null when onboarding is done. */
export function onboardingPath(me: Pick<Me, "role" | "isAdmin" | "onboarding">) {
  if (me.role === "pending_practitioner") return "/pending-approval";
  if (me.role === "practitioner" || me.isAdmin) return null;
  if (!me.role || me.onboarding === "role") return "/sign-up";
  if (me.onboarding === "done") return null;
  return `/onboarding/${me.onboarding}`;
}

/** Does this account hold one of the allowed roles? Admins count as practitioners. */
export function hasRole(me: Pick<Me, "role" | "isAdmin">, allow: AppRole[]) {
  if (allow.includes("admin") && me.isAdmin) return true;
  if (allow.includes("practitioner") && (me.role === "practitioner" || me.isAdmin)) return true;
  return !!me.role && allow.includes(me.role as AppRole);
}
