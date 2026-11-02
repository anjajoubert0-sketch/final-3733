import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export const useHub = () => useQuery(orpc.practitioner.hub.queryOptions());
export const useCoachList = (enabled = true) => useQuery({ ...orpc.practitioner.coaches.queryOptions(), enabled });
export const useIndividualList = (enabled = true) => useQuery({ ...orpc.practitioner.individuals.queryOptions(), enabled });
export const useAllAthletes = () => useQuery(orpc.practitioner.athletes.queryOptions());
