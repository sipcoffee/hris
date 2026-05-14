import { Clock, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCheckIn, useCheckOut, useMyAttendance } from "@/hooks/useAttendance";
import { apiError } from "@/lib/api";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CheckInCard() {
  const today = todayIso();
  const { data, isLoading } = useMyAttendance({ from: today, to: today });
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const record = data?.[0];

  async function doCheckIn() {
    try {
      await checkIn.mutateAsync();
      toast.success("Checked in");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function doCheckOut() {
    try {
      await checkOut.mutateAsync();
      toast.success("Checked out");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle>Today's attendance</CardTitle>
        </div>
        <CardDescription>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : record?.status === "ON_LEAVE" ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">You're on approved leave today.</p>
              <p className="text-xs text-muted-foreground">Enjoy your time off.</p>
            </div>
            <AttendanceStatusBadge status={record.status} />
          </div>
        ) : !record || !record.check_in_at ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">You haven't checked in yet.</p>
            <Button onClick={doCheckIn} disabled={checkIn.isPending}>
              <LogIn className="mr-2 h-4 w-4" />
              {checkIn.isPending ? "Checking in…" : "Check in"}
            </Button>
          </div>
        ) : record.check_out_at == null ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm">
                Checked in at <span className="font-medium">{formatTime(record.check_in_at)}</span>
              </p>
              <div className="mt-1"><AttendanceStatusBadge status={record.status} /></div>
            </div>
            <Button variant="secondary" onClick={doCheckOut} disabled={checkOut.isPending}>
              <LogOut className="mr-2 h-4 w-4" />
              {checkOut.isPending ? "Checking out…" : "Check out"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">
                {formatTime(record.check_in_at)} → {formatTime(record.check_out_at)}
                {record.hours_worked && (
                  <span className="ml-2 text-muted-foreground tabular">
                    ({record.hours_worked} h)
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Done for today.</p>
            </div>
            <AttendanceStatusBadge status={record.status} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
