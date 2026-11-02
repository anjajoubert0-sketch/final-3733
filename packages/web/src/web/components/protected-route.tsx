import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useMe } from "../queries/me";
import { hasRole, homeFor, type AppRole } from "../lib/roles";
import { Loading, NotAvailable } from "./empty-states";

/** Signed out → /sign-in. Wrong role → "Not available" (or home, with redirectOthers). */
export function Guard({ allow, redirectOthers, children }: { allow: AppRole[]; redirectOthers?: boolean; children: ReactNode }) {
  const { data: me, isPending } = useMe();
  if (isPending) return <Loading label="Checking your account" />;
  if (!me) return <Redirect to="/sign-in" />;
  if (!hasRole(me, allow)) return redirectOthers ? <Redirect to={homeFor(me)} /> : <NotAvailable home={homeFor(me)} />;
  return <>{children}</>;
}
