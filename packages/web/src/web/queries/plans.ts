import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { useAction } from "./shared";

export const usePlans = () => useQuery(orpc.plans.list.queryOptions());
export const usePricing = () => useQuery(orpc.plans.pricing.queryOptions());
export const useMyPlan = () => useQuery(orpc.plans.mine.queryOptions());
export const useChoosePlan = () => useAction(orpc.plans.choose.mutationOptions());
