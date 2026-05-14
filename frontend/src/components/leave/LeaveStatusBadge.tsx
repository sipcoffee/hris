import { Badge } from "@/components/ui/badge";
import type { LeaveStatus } from "@/types/api";

const LABEL: Record<LeaveStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const VARIANT: Record<LeaveStatus, "warning" | "success" | "destructive" | "muted"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  CANCELLED: "muted",
};

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
