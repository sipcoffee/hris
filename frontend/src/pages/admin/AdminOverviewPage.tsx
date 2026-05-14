import { CalendarRange, Megaphone, Plus, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminStats } from "@/hooks/useAdmin";

export function AdminOverviewPage() {
  const { data: stats, isLoading } = useAdminStats();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Admin</h1>
        <p className="text-muted-foreground">Snapshot of headcount, leave, and attendance.</p>
      </div>

      {isLoading || !stats ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Active employees" value={stats.headcount.total_active} />
            <StatCard
              label="On leave"
              value={stats.headcount.by_status["ON_LEAVE"] ?? 0}
            />
            <StatCard
              label="Terminated"
              value={stats.headcount.by_status["TERMINATED"] ?? 0}
              muted
            />
            <StatCard
              label="Pending leave requests"
              value={stats.pending_leave_count}
              accent={stats.pending_leave_count > 0}
              href={stats.pending_leave_count > 0 ? "/admin/leave" : undefined}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Today's attendance</CardTitle>
                <CardDescription>Active employees only.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <AttendanceTile label="Present" value={stats.today_attendance.present} variant="success" />
                  <AttendanceTile label="Late" value={stats.today_attendance.late} variant="warning" />
                  <AttendanceTile label="Half day" value={stats.today_attendance.half_day} variant="warning" />
                  <AttendanceTile label="On leave" value={stats.today_attendance.on_leave} variant="secondary" />
                  <AttendanceTile
                    label="Not in"
                    value={stats.today_attendance.not_checked_in}
                    variant={stats.today_attendance.not_checked_in > 0 ? "destructive" : "muted"}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active by department</CardTitle>
                <CardDescription>Excludes terminated employees.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {stats.headcount.by_department.length === 0 ? (
                  <p className="px-6 pb-6 text-sm text-muted-foreground">No departments yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">Headcount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.headcount.by_department.map((d) => (
                        <TableRow key={`${d.department_id ?? "none"}-${d.department_name}`}>
                          <TableCell className="font-medium">{d.department_name}</TableCell>
                          <TableCell className="text-right tabular">{d.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/admin/employees/new">
              <Plus className="mr-2 h-4 w-4" /> New employee
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/leave"><CalendarRange className="mr-2 h-4 w-4" /> Leave queue</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/announcements"><Megaphone className="mr-2 h-4 w-4" /> Post announcement</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/users"><Users className="mr-2 h-4 w-4" /> Users</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  muted,
  href,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
  href?: string;
}) {
  const inner = (
    <Card className={accent ? "border-primary/50" : undefined}>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={
            "font-display text-3xl tabular " +
            (accent ? "text-primary" : muted ? "text-muted-foreground" : "")
          }
        >
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

function AttendanceTile({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "success" | "warning" | "destructive" | "secondary" | "muted";
}) {
  const colors: Record<typeof variant, string> = {
    success: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-800",
    destructive: "bg-red-50 text-red-800",
    secondary: "bg-secondary text-secondary-foreground",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className={`rounded-lg p-3 text-center ${colors[variant]}`}>
      <p className="font-display text-2xl font-semibold tabular leading-none">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider">{label}</p>
    </div>
  );
}
