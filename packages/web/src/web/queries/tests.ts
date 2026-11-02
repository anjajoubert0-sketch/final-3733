import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { useAction } from "./shared";

export const useTestList = (status: "pending" | "published" | "all" = "all") => useQuery(orpc.tests.list.queryOptions({ input: { status } }));
export const useTest = (testId?: string) =>
  useQuery({ ...orpc.tests.get.queryOptions({ input: { testId: testId ?? "" } }), enabled: !!testId, retry: false });
export const useTestAudit = (testId?: string, enabled = true) =>
  useQuery({ ...orpc.tests.audit.queryOptions({ input: { testId: testId ?? "" } }), enabled: !!testId && enabled });
export const useThresholds = () => useQuery(orpc.tests.thresholds.queryOptions());

export const useCreateTest = () => useAction(orpc.tests.create.mutationOptions());
export const useUpdateTest = () => useAction(orpc.tests.update.mutationOptions());
export const useSetTestStatus = () => useAction(orpc.tests.setStatus.mutationOptions());
export const usePublishTest = () => useAction(orpc.tests.publish.mutationOptions());
export const useReopenTest = () => useAction(orpc.tests.reopen.mutationOptions());
export const useRemoveTest = () => useAction(orpc.tests.remove.mutationOptions());
export const useSetThresholds = () => useAction(orpc.tests.setThresholds.mutationOptions());
