import { CalendarPlus, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { LeaveBalanceWidget } from "@/components/leave/LeaveBalanceWidget";
import { LeaveStatusBadge } from "@/components/leave/LeaveStatusBadge";
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
import { useCancelLeaveRequest, useLeaveRequests } from "@/hooks/useLeaveRequests";
import { apiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export function LeavePage() {
  const { data, isLoading } = useLeaveRequests();
  const cancel = useCancelLeaveRequest();

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Time off</h1>
          <p className="text-muted-foreground">Your leave requests and balances.</p>
        </div>
        <Button asChild>
          <Link to="/leave/new">
            <CalendarPlus className="mr-2 h-4 w-4" />
            Request leave
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <LeaveBalanceWidget />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Loading…</div>
          ) : !data?.length ? (
            <div className="p-10 text-center text-muted-foreground">
              No requests yet. Click <span className="font-medium">Request leave</span> to start.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.leave_type.name}</TableCell>
                    <TableCell>{formatDate(r.start_date)}</TableCell>
                    <TableCell>{formatDate(r.end_date)}</TableCell>
                    <TableCell className="text-right tabular">{r.days_count}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {r.reason || "—"}
                    </TableCell>
                    <TableCell><LeaveStatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      {r.status === "PENDING" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Cancel"
                          onClick={async () => {
                            if (!confirm("Cancel this request?")) return;
                            try {
                              await cancel.mutateAsync({ id: r.id });
                              toast.success("Request cancelled");
                            } catch (err) {
                              toast.error(apiError(err));
                            }
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
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
