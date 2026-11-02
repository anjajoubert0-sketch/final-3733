import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { useAction } from "./shared";

export type Me = NonNullable<Awaited<ReturnType<typeof import("../lib/api").client.me.get>>>;

export const useMe = () => useQuery({ ...orpc.me.get.queryOptions(), staleTime: 30_000 });
export const useMyRequest = () => useQuery(orpc.me.myRequest.queryOptions());
export const useProfile = () => useQuery(orpc.me.profile.queryOptions());

export const useChooseRole = () => useAction(orpc.me.chooseRole.mutationOptions());
export const useRequestPractitioner = () => useAction(orpc.me.requestPractitioner.mutationOptions());
export const useSetOnboarding = () => useAction(orpc.me.setOnboarding.mutationOptions());
export const useSaveProfile = () => useAction(orpc.me.saveProfile.mutationOptions());
export const useRename = () => useAction(orpc.me.rename.mutationOptions());
