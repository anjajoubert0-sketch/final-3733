import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Link } from "wouter";
import { setCurrentThresholds, type Athlete } from "../lib/demo-data";
import { useSquadList, useAthleteDetail } from "../queries/squad";
import { useMe } from "../queries/me";
import { useActiveTeamId } from "./use-active-team";
import { EmptyState, ErrorNote, Loading, btn } from "../components/empty-states";

type SquadList = NonNullable<ReturnType<typeof useSquadList>["data"]>;
export type SquadTeam = SquadList["team"];
export type SquadData = SquadList & { getAthlete: (id: string | undefined) => Athlete | undefined };

const SquadContext = createContext<SquadData | null>(null);

/** The coach's active team, chosen in the team switcher (falls back to the first team). */
export function useCurrentTeamId() {
  const stored = useActiveTeamId();
  const { data: me } = useMe();
  const teams = me?.teams ?? [];
  if (stored && teams.some((t) => t.id === stored)) return stored;
  return teams[0]?.id;
}

/** Loads the active team's squad through the permission layer and provides it to coach pages. */
export function SquadProvider({ children }: { children: ReactNode }) {
  const teamId = useCurrentTeamId();
  const q = useSquadList(teamId);
  const value = useMemo<SquadData | null>(() => {
    if (!q.data) return null;
    const byId = new Map(q.data.athletes.map((a) => [a.id, a]));
    return { ...q.data, getAthlete: (id) => (id ? byId.get(id) : undefined) };
  }, [q.data]);
  if (q.data) setCurrentThresholds(q.data.thresholds); // classification uses the practitioner-set thresholds
  if (q.isPending) return <Loading label="Loading squad" />;
  if (q.error) return <ErrorNote error={q.error} className="my-10" />;
  if (!value)
    return (
      <EmptyState
        className="my-10"
        title="No team yet"
        body="Create your team to start adding athletes and booking performance testing."
        action={
          <Link href="/team" className={btn()}>
            Create a team
          </Link>
        }
      />
    );
  return <SquadContext.Provider value={value}>{children}</SquadContext.Provider>;
}

export function useSquad(): SquadData {
  const v = useContext(SquadContext);
  if (!v) throw new Error("useSquad must be used inside <SquadProvider>");
  return v;
}

/** One passport (tests filtered for this viewer on the server). */
export function useAthlete(id: string | undefined) {
  const q = useAthleteDetail(id);
  return q;
}
export type AthleteDetail = NonNullable<ReturnType<typeof useAthleteDetail>["data"]>;
