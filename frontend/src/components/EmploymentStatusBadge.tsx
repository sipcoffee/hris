import { Badge } from "@/components/ui/badge";
import type { EmploymentStatus } from "@/types/api";

const LABEL: Record<EmploymentStatus, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  TERMINATED: "Terminated",
};

const VARIANT: Record<EmploymentStatus, "success" | "warning" | "muted"> = {
  ACTIVE: "success",
  ON_LEAVE: "warning",
  TERMINATED: "muted",
};

export function EmploymentStatusBadge({ status }: { status: EmploymentStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
