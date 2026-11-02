import { useMe } from "../queries/me";

export type ViewerRole = "Practitioner" | "Coach" | "Individual";

/** The signed-in account's view mode for shared pages (passport, report, squad tables). */
export function useViewerRole(): ViewerRole {
  const { data: me } = useMe();
  if (me?.isStaff) return "Practitioner";
  if (me?.role === "individual") return "Individual";
  return "Coach";
}
