import { useMe } from "../queries/me";

export type ViewerRole = "Practitioner" | "Coach" | "Individual";

/** The signed-in account's view mode for shared pages (passport, report, squad tables). */
export function useViewerRole(): ViewerRole {
  const { data: me } = useMe();
  if (me?.isStaff) return "Practitioner";
  if (me?.role === "individual") return "Individual";
  return "Coach";
}

/** Route to a test report for this viewer. */
export function testHref(role: ViewerRole, athleteId: string, testId: string) {
  if (role === "Practitioner") return `/practitioner/athletes/${athleteId}/tests/${testId}`;
  if (role === "Individual") return `/me/tests/${testId}`;
  return `/athletes/${athleteId}/tests/${testId}`;
}

/** Route to an athlete passport for this viewer. */
export function passportHref(role: ViewerRole, athleteId: string) {
  if (role === "Practitioner") return `/practitioner/athletes/${athleteId}`;
  if (role === "Individual") return "/me/passport";
  return `/athletes/${athleteId}`;
}
