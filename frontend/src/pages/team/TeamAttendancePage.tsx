import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAttendance } from "@/hooks/useAttendance";
import { formatDate } from "@/lib/utils";

function monthBounds(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const label = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { from: fmt(start), to: fmt(end), label };
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function TeamAttendancePage() {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const range = useMemo(() => monthBounds(cursor.year, cursor.month), [cursor]);
  const { data, isLoading } = useAttendance({ from: range.from, to: range.to });

  function nudge(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Team attendance</h1>
        <p className="text-muted-foreground">Daily attendance for your direct reports.</p>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">{range.label}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => nudge(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => nudge(1)} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Loading…</div>
          ) : !data?.length ? (
            <div className="p-10 text-center text-muted-foreground">
              No attendance from your reports in this range.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Check in</TableHead>
                  <TableHead>Check out</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{formatDate(r.date)}</TableCell>
                    <TableCell>
                      {r.employee.first_name} {r.employee.last_name}
                      <p className="text-xs text-muted-foreground">{r.employee.job_title}</p>
                    </TableCell>
                    <TableCell className="tabular">{formatTime(r.check_in_at)}</TableCell>
                    <TableCell className="tabular">{formatTime(r.check_out_at)}</TableCell>
                    <TableCell className="text-right tabular">{r.hours_worked ?? "—"}</TableCell>
                    <TableCell><AttendanceStatusBadge status={r.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
