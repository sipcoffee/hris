import { Check, MessageSquare, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useDecideLeaveRequest, useLeaveRequests } from "@/hooks/useLeaveRequests";
import { apiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { LeaveRequest, LeaveStatus } from "@/types/api";

const STATUS_FILTERS: { label: string; value: LeaveStatus | "ALL" }[] = [
  { label: "Pending only", value: "PENDING" },
  { label: "All", value: "ALL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export function TeamLeavePage() {
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "ALL">("PENDING");
  const params = useMemo(
    () => ({
      team: true,
      status: statusFilter !== "ALL" ? statusFilter : undefined,
    }),
    [statusFilter],
  );
  const { data, isLoading } = useLeaveRequests(params);

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Team time off</h1>
          <p className="text-muted-foreground">Approve or reject your reports' requests.</p>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeaveStatus | "ALL")}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
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
            <div className="p-10 text-center text-muted-foreground">
              {statusFilter === "PENDING"
                ? "No pending requests from your reports."
                : "No requests match this filter."}
            </div>
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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <RequestRow key={r.id} request={r} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RequestRow({ request }: { request: LeaveRequest }) {
  const decide = useDecideLeaveRequest();
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");

  async function submit(status: "APPROVED" | "REJECTED") {
    try {
      await decide.mutateAsync({ id: request.id, input: { status, note: note || undefined } });
      toast.success(status === "APPROVED" ? "Approved" : "Rejected");
      setNote("");
      setShowNote(false);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <p className="font-medium">
            {request.employee.first_name} {request.employee.last_name}
          </p>
          <p className="text-xs text-muted-foreground">{request.employee.job_title}</p>
        </TableCell>
        <TableCell>{request.leave_type.name}</TableCell>
        <TableCell>
          {formatDate(request.start_date)} → {formatDate(request.end_date)}
        </TableCell>
        <TableCell className="text-right tabular">{request.days_count}</TableCell>
        <TableCell className="max-w-xs truncate text-muted-foreground">
          {request.reason || "—"}
        </TableCell>
        <TableCell><LeaveStatusBadge status={request.status} /></TableCell>
        <TableCell className="text-right">
          {request.status === "PENDING" && (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Add note"
                onClick={() => setShowNote((v) => !v)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reject"
                onClick={() => submit("REJECTED")}
                disabled={decide.isPending}
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Approve"
                onClick={() => submit("APPROVED")}
                disabled={decide.isPending}
              >
                <Check className="h-4 w-4 text-emerald-600" />
              </Button>
            </div>
          )}
        </TableCell>
      </TableRow>
      {showNote && request.status === "PENDING" && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30">
            <Textarea
              rows={2}
              placeholder="Optional note attached to the decision"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
