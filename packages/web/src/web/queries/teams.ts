import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { useAction } from "./shared";

export const useMyTeams = () => useQuery(orpc.teams.mine.queryOptions());
export const useTeamMembers = (teamId?: string) =>
  useQuery({ ...orpc.teams.members.queryOptions({ input: { teamId: teamId ?? "" } }), enabled: !!teamId });
export const useMyLinks = () => useQuery(orpc.teams.myLinks.queryOptions());

export const useCreateTeam = () => useAction(orpc.teams.create.mutationOptions());
export const useUpdateTeam = () => useAction(orpc.teams.update.mutationOptions());
export const useRegenerateCode = () => useAction(orpc.teams.regenerateCode.mutationOptions());
export const useAddAthletes = () => useAction(orpc.teams.addAthletes.mutationOptions());
export const useUpdateTeamAthlete = () => useAction(orpc.teams.updateAthlete.mutationOptions());
export const useRemoveAthlete = () => useAction(orpc.teams.removeAthlete.mutationOptions());
export const useClaimLink = () => useAction(orpc.teams.claimLink.mutationOptions());
export const useJoinByCode = () => useAction(orpc.teams.joinByCode.mutationOptions());
export const useSetSharing = () => useAction(orpc.teams.setSharing.mutationOptions());
export const useConfirmConsent = () => useAction(orpc.teams.confirmConsent.mutationOptions());
export const useLeaveTeam = () => useAction(orpc.teams.leave.mutationOptions());
