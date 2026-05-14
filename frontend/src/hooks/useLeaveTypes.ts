import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { LeaveType } from "@/types/api";

export interface LeaveTypeInput {
  name: string;
  default_days_per_year?: string;
  is_paid?: boolean;
  is_active?: boolean;
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: ["leave-types"],
    queryFn: async () => (await api.get<LeaveType[]>("/leave-types")).data,
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LeaveTypeInput) =>
      (await api.post<LeaveType>("/leave-types", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave-types"] }),
  });
}

export function useUpdateLeaveType(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<LeaveTypeInput>) =>
      (await api.put<LeaveType>(`/leave-types/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave-types"] }),
  });
}

export function useDeleteLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/leave-types/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave-types"] }),
  });
}
