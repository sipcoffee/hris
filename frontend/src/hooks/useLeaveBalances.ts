import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { LeaveBalance } from "@/types/api";

export interface BalanceAdjustInput {
  allocated_days?: string;
  used_days?: string;
}

export function useMyLeaveBalances(year?: number) {
  return useQuery({
    queryKey: ["leave-balances", "me", year],
    queryFn: async () =>
      (await api.get<LeaveBalance[]>("/leave/balances/me", { params: { year } })).data,
  });
}

export function useLeaveBalances(params: { employee_id?: number; year?: number } = {}) {
  return useQuery({
    queryKey: ["leave-balances", params],
    queryFn: async () =>
      (await api.get<LeaveBalance[]>("/leave/balances", { params })).data,
  });
}

export function useAdjustLeaveBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: BalanceAdjustInput }) =>
      (await api.put<LeaveBalance>(`/leave/balances/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave-balances"] }),
  });
}
