import { CalendarClock } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMyLeaveBalances } from "@/hooks/useLeaveBalances";

function pretty(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return n % 1 === 0 ? n.toString() : n.toFixed(1);
}

export function LeaveBalanceWidget() {
  const { data, isLoading } = useMyLeaveBalances();
  const year = new Date().getFullYear();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          <CardTitle>Leave balances</CardTitle>
        </div>
        <CardDescription>Days available in {year}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leave balances yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{b.leave_type.name}</p>
                  <p className="text-xs text-muted-foreground tabular">
                    {pretty(b.used_days)} used · {pretty(b.allocated_days)} allocated
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-semibold tabular leading-none">
                    {pretty(b.remaining_days)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">left</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
