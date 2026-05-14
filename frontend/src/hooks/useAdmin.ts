import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { AdminStats, AdminUser } from "@/types/api";

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => (await api.get<AdminStats>("/admin/stats")).data,
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => (await api.get<AdminUser[]>("/admin/users")).data,
  });
}
