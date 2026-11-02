import { useMutation, useQueryClient, type MutationFunction } from "@tanstack/react-query";

/**
 * Mutation that refreshes every cached query on success. Writes in this app touch several views
 * (squad, passport, bookings, hub counts), so a full refresh keeps them consistent.
 */
export function useAction<TData, TVars>(options: { mutationFn?: MutationFunction<TData, TVars>; mutationKey?: readonly unknown[] }) {
  const qc = useQueryClient();
  return useMutation<TData, Error, TVars>({
    ...(options as object),
    onSuccess: () => qc.invalidateQueries(),
  });
}
