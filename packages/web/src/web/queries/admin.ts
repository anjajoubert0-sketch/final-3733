import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { useAction } from "./shared";

export const usePractitionerRequests = () => useQuery(orpc.admin.requests.queryOptions());
export const useAdminInvites = () => useQuery(orpc.admin.invites.queryOptions());
export const useAdminPayments = () => useQuery(orpc.admin.payments.queryOptions());
export const useAdminPricing = () => useQuery(orpc.admin.pricing.queryOptions());

export const useDecideRequest = () => useAction(orpc.admin.decideRequest.mutationOptions());
export const useInvitePractitioner = () => useAction(orpc.admin.invitePractitioner.mutationOptions());
export const useRevokeInvite = () => useAction(orpc.admin.revokeInvite.mutationOptions());
export const useVerifyPayment = () => useAction(orpc.admin.verifyPayment.mutationOptions());
export const useSetPricing = () => useAction(orpc.admin.setPricing.mutationOptions());
export const useSetPlanFees = () => useAction(orpc.admin.setPlanFees.mutationOptions());
export const useResetDemo = () => useAction(orpc.admin.resetDemo.mutationOptions());
