import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { AttendanceRecord, AttendanceStatus } from "@/types/api";

export interface AttendanceQuery {
  from?: string;
  to?: string;
  employee_id?: number;
  department_id?: number;
}

export interface AttendanceCreateInput {
  employee_id: number;
  date: string;
  check_in_at?: string | null;
  check_out_at?: string | null;
  status?: AttendanceStatus | null;
  note?: string | null;
}

export interface AttendanceUpdateInput {
  check_in_at?: string | null;
  check_out_at?: string | null;
  status?: AttendanceStatus | null;
  note?: string | null;
}

export function useMyAttendance(params: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ["attendance", "me", params],
    queryFn: async () =>
      (await api.get<AttendanceRecord[]>("/attendance/me", { params })).data,
  });
}

export function useAttendance(params: AttendanceQuery = {}) {
  return useQuery({
    queryKey: ["attendance", params],
    queryFn: async () =>
      (await api.get<AttendanceRecord[]>("/attendance", { params })).data,
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<AttendanceRecord>("/attendance/check-in")).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<AttendanceRecord>("/attendance/check-out")).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useCreateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AttendanceCreateInput) =>
      (await api.post<AttendanceRecord>("/attendance", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: AttendanceUpdateInput }) =>
      (await api.put<AttendanceRecord>(`/attendance/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useDeleteAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/attendance/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}
