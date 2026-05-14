import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { LeaveStatusBadge } from "@/components/leave/LeaveStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCancelLeaveRequest,
  useDecideLeaveRequest,
  useLeaveRequests,
} from "@/hooks/useLeaveRequests";
import { apiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { LeaveStatus } from "@/types/api";

const STATUS_OPTIONS: { label: string; value: LeaveStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export function AdminLeavePage() {
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "ALL">("ALL");
  const params = useMemo(
    () => ({
      all_users: true,
      status: statusFilter !== "ALL" ? statusFilter : undefined,
    }),
    [statusFilter],
  );

  const { data, isLoading } = useLeaveRequests(params);
  const decide = useDecideLeaveRequest();
  const cancel = useCancelLeaveRequest();

  async function doDecide(id: number, status: "APPROVED" | "REJECTED") {
    try {
      await decide.mutateAsync({ id, input: { status } });
      toast.success(status === "APPROVED" ? "Approved" : "Rejected");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function doCancel(id: number) {
    if (!confirm("Cancel this request? Approved leave will be re-credited to the balance.")) return;
    try {
      await cancel.mutateAsync({ id });
      toast.success("Cancelled");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Leave requests</h1>
          <p className="text-muted-foreground">{data?.length ?? 0} request(s) match.</p>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeaveStatus | "ALL")}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Loading…</div>
          ) : !data?.length ? (
            <div className="p-10 text-center text-muted-foreground">No requests.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Decided</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium">
                        {r.employee.first_name} {r.employee.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.employee.job_title}</p>
                    </TableCell>
                    <TableCell>{r.leave_type.name}</TableCell>
                    <TableCell>
                      {formatDate(r.start_date)} → {formatDate(r.end_date)}
                    </TableCell>
                    <TableCell className="text-right tabular">{r.days_count}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {r.reason || "—"}
                    </TableCell>
                    <TableCell><LeaveStatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.decided_at ? formatDate(r.decided_at) : "—"}
                      {r.decided_by && <div>by {r.decided_by.email}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {r.status === "PENDING" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Reject"
                              onClick={() => doDecide(r.id, "REJECTED")}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Approve"
                              onClick={() => doDecide(r.id, "APPROVED")}
                            >
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                          </>
                        )}
                        {(r.status === "PENDING" || r.status === "APPROVED") && (
                          <Button variant="ghost" size="sm" onClick={() => doCancel(r.id)}>
                            Cancel
                          </Button>
                        )}
                      </div>
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
