import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  Employee,
  EmployeeCreated,
  EmployeeListResponse,
  EmploymentStatus,
  EmploymentType,
  UserRole,
} from "@/types/api";

export interface EmployeesQuery {
  q?: string;
  department_id?: number;
  employment_status?: EmploymentStatus;
  page?: number;
  page_size?: number;
}

export interface EmployeeCreateInput {
  email: string;
  password: string;
  role?: UserRole;
  must_change_password?: boolean;
  first_name: string;
  last_name: string;
  job_title: string;
  employment_type?: EmploymentType;
  hire_date: string;
  department_id?: number | null;
  manager_id?: number | null;
  date_of_birth?: string | null;
  phone?: string | null;
  address?: string | null;
  salary?: string | null;
}

export interface EmployeeUpdateInput {
  first_name?: string;
  last_name?: string;
  job_title?: string;
  employment_type?: EmploymentType;
  employment_status?: EmploymentStatus;
  hire_date?: string;
  termination_date?: string | null;
  department_id?: number | null;
  manager_id?: number | null;
  date_of_birth?: string | null;
  phone?: string | null;
  address?: string | null;
  salary?: string | null;
  role?: UserRole;
  is_active?: boolean;
}

export interface EmployeeSelfUpdateInput {
  phone?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
}

export function useEmployees(params: EmployeesQuery = {}) {
  return useQuery({
    queryKey: ["employees", params],
    queryFn: async () =>
      (await api.get<EmployeeListResponse>("/employees", { params })).data,
  });
}

export function useEmployee(id: number | undefined) {
  return useQuery({
    queryKey: ["employee", id],
    queryFn: async () => (await api.get<Employee>(`/employees/${id}`)).data,
    enabled: typeof id === "number" && !Number.isNaN(id),
  });
}

export function useMyEmployee() {
  return useQuery({
    queryKey: ["employee", "me"],
    queryFn: async () => (await api.get<Employee>("/employees/me")).data,
  });
}

export function useUpdateMyEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmployeeSelfUpdateInput) =>
      (await api.put<Employee>("/employees/me", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee", "me"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmployeeCreateInput) =>
      (await api.post<EmployeeCreated>("/employees", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useUpdateEmployee(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmployeeUpdateInput) =>
      (await api.put<Employee>(`/employees/${id}`, input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employee", id] });
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useTerminateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.delete<Employee>(`/employees/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}
