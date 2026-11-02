import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { useAction } from "./shared";

export const useSessions = (athleteId?: string, enabled = true) =>
  useQuery({ ...orpc.training.sessions.queryOptions({ input: { athleteId: athleteId ?? "" } }), enabled: !!athleteId && enabled, retry: false });
export const useCheckins = (athleteId?: string, enabled = true) =>
  useQuery({ ...orpc.training.checkins.queryOptions({ input: { athleteId: athleteId ?? "" } }), enabled: !!athleteId && enabled, retry: false });
export const useMyCalendar = () => useQuery(orpc.training.myCalendar.queryOptions());

export const useCreateSession = () => useAction(orpc.training.createSession.mutationOptions());
export const useUpdateSession = () => useAction(orpc.training.updateSession.mutationOptions());
export const useRemoveSession = () => useAction(orpc.training.removeSession.mutationOptions());
export const useSaveCheckin = () => useAction(orpc.training.saveCheckin.mutationOptions());
export const useRemoveCheckin = () => useAction(orpc.training.removeCheckin.mutationOptions());
export const useAddPersonalEvent = () => useAction(orpc.training.addPersonalEvent.mutationOptions());
export const useRemovePersonalEvent = () => useAction(orpc.training.removePersonalEvent.mutationOptions());
