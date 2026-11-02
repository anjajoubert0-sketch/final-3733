import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { useAction } from "./shared";

export const useInvitePreview = (token: string) => useQuery({ ...orpc.invites.preview.queryOptions({ input: { token } }), retry: false });
export const useAcceptInvite = () => useAction(orpc.invites.accept.mutationOptions());
