import { Megaphone } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { formatDateTime } from "@/lib/utils";

export function AnnouncementsWidget({ limit = 3 }: { limit?: number }) {
  const { data, isLoading } = useAnnouncements(limit);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <CardTitle>Announcements</CardTitle>
        </div>
        <CardDescription>Latest updates from HR.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          <ul className="space-y-4">
            {data.map((a) => (
              <li key={a.id} className="border-b pb-4 last:border-0 last:pb-0">
                <p className="font-medium">{a.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDateTime(a.posted_at)} · {a.posted_by.email}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
