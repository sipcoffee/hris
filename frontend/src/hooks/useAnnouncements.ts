import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Announcement } from "@/types/api";

export interface AnnouncementInput {
  title: string;
  body: string;
}

export function useAnnouncements(limit?: number) {
  return useQuery({
    queryKey: ["announcements", { limit }],
    queryFn: async () =>
      (await api.get<Announcement[]>("/announcements", { params: { limit } })).data,
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AnnouncementInput) =>
      (await api.post<Announcement>("/announcements", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}
