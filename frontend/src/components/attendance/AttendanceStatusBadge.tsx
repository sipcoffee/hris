import { Badge } from "@/components/ui/badge";
import type { AttendanceStatus } from "@/types/api";

const LABEL: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  HALF_DAY: "Half day",
  ON_LEAVE: "On leave",
};

const VARIANT: Record<AttendanceStatus, "success" | "destructive" | "warning" | "muted" | "secondary"> = {
  PRESENT: "success",
  ABSENT: "destructive",
  LATE: "warning",
  HALF_DAY: "warning",
  ON_LEAVE: "secondary",
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
