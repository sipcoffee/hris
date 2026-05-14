import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { LeaveRequest, LeaveStatus } from "@/types/api";

export interface LeaveRequestCreateInput {
  leave_type_id: number;
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface LeaveDecisionInput {
  status: "APPROVED" | "REJECTED";
  note?: string;
}

export interface LeaveRequestsQuery {
  team?: boolean;
  all_users?: boolean;
  status?: LeaveStatus;
}

export function useLeaveRequests(params: LeaveRequestsQuery = {}) {
  return useQuery({
    queryKey: ["leave-requests", params],
    queryFn: async () => (await api.get<LeaveRequest[]>("/leave/requests", { params })).data,
  });
}

export function useLeaveRequest(id: number | undefined) {
  return useQuery({
    queryKey: ["leave-request", id],
    queryFn: async () => (await api.get<LeaveRequest>(`/leave/requests/${id}`)).data,
    enabled: typeof id === "number",
  });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LeaveRequestCreateInput) =>
      (await api.post<LeaveRequest>("/leave/requests", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      qc.invalidateQueries({ queryKey: ["leave-balances"] });
    },
  });
}

export function useDecideLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: LeaveDecisionInput }) =>
      (await api.patch<LeaveRequest>(`/leave/requests/${id}/decision`, input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      qc.invalidateQueries({ queryKey: ["leave-balances"] });
    },
  });
}

export function useCancelLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: number; note?: string }) =>
      (await api.patch<LeaveRequest>(`/leave/requests/${id}/cancel`, { note })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      qc.invalidateQueries({ queryKey: ["leave-balances"] });
    },
  });
}
