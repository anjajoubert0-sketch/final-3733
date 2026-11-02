import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export const squadListOptions = (teamId?: string) => orpc.squad.list.queryOptions({ input: { teamId } });
export const useSquadList = (teamId?: string, enabled = true) => useQuery({ ...squadListOptions(teamId), enabled });
export const useAthleteDetail = (athleteId?: string) =>
  useQuery({ ...orpc.squad.athlete.queryOptions({ input: { athleteId: athleteId ?? "" } }), enabled: !!athleteId, retry: false });
export const useSelfPassport = (enabled = true) => useQuery({ ...orpc.squad.self.queryOptions(), enabled });
export const useCoachTeams = () => useQuery(orpc.squad.coachTeams.queryOptions());
