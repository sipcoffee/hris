import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Department } from "@/types/api";

export interface DepartmentInput {
  name: string;
  description?: string | null;
  head_employee_id?: number | null;
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await api.get<Department[]>("/departments")).data,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DepartmentInput) =>
      (await api.post<Department>("/departments", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useUpdateDepartment(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<DepartmentInput>) =>
      (await api.put<Department>(`/departments/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/departments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}
