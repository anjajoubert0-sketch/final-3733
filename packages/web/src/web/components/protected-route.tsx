import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useMe } from "../queries/me";
import { hasRole, homeFor, onboardingPath, type AppRole } from "../lib/roles";
import { Loading, NotAvailable } from "./empty-states";

/**
 * Signed out → /sign-in. Unfinished onboarding → that step. Wrong role → "Not available"
 * (or home, with redirectOthers). Pass `onboarding` on the onboarding pages themselves.
 */
export function Guard({ allow, redirectOthers, onboarding, children }: { allow: AppRole[]; redirectOthers?: boolean; onboarding?: boolean; children: ReactNode }) {
  const { data: me, isPending } = useMe();
  if (isPending) return <Loading label="Checking your account" />;
  if (!me) return <Redirect to="/sign-in" />;
  const step = onboardingPath(me);
  if (!onboarding && step) return <Redirect to={step} />;
  if (!hasRole(me, allow)) return redirectOthers ? <Redirect to={homeFor(me)} /> : <NotAvailable home={homeFor(me)} />;
  return <>{children}</>;
}

/** Signed-in account in any state (sign-up role choice, pending approval, onboarding). */
export function SignedIn({ children }: { children: ReactNode }) {
  const { data: me, isPending } = useMe();
  if (isPending) return <Loading label="Checking your account" />;
  if (!me) return <Redirect to="/sign-in" />;
  return <>{children}</>;
}
