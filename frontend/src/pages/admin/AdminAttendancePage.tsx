import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  useAttendance,
  useCreateAttendance,
  useDeleteAttendance,
  useUpdateAttendance,
} from "@/hooks/useAttendance";
import { useDepartments } from "@/hooks/useDepartments";
import { useEmployees } from "@/hooks/useEmployees";
import { apiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { AttendanceRecord, AttendanceStatus } from "@/types/api";

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

function toLocalDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_OPTIONS: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "HALF_DAY", "ON_LEAVE"];

const recordSchema = z.object({
  employee_id: z.string().min(1, "Required"),
  date: z.string().min(1, "Required"),
  check_in_at: z.string().optional().or(z.literal("")),
  check_out_at: z.string().optional().or(z.literal("")),
  status: z.enum(["AUTO", "PRESENT", "ABSENT", "LATE", "HALF_DAY", "ON_LEAVE"]),
  note: z.string().max(2000).optional().or(z.literal("")),
});

type RecordFormValues = z.infer<typeof recordSchema>;

const NONE = "__NONE__";

export function AdminAttendancePage() {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const range = useMemo(() => monthBounds(cursor.year, cursor.month), [cursor]);

  const [employeeFilter, setEmployeeFilter] = useState<string>(NONE);
  const [departmentFilter, setDepartmentFilter] = useState<string>(NONE);

  const params = useMemo(
    () => ({
      from: range.from,
      to: range.to,
      employee_id: employeeFilter !== NONE ? Number(employeeFilter) : undefined,
      department_id: departmentFilter !== NONE ? Number(departmentFilter) : undefined,
    }),
    [range.from, range.to, employeeFilter, departmentFilter],
  );

  const { data, isLoading } = useAttendance(params);
  const { data: employees } = useEmployees({ page_size: 200 });
  const { data: departments } = useDepartments();
  const remove = useDeleteAttendance();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);

  function nudge(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Attendance</h1>
          <p className="text-muted-foreground">{data?.length ?? 0} record(s) in this view.</p>
        </div>
        <Button onClick={() => { setEditing(null); setCreating(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add record
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => nudge(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[10rem] text-center font-display text-lg">{range.label}</span>
          <Button variant="ghost" size="icon" onClick={() => nudge(1)} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="md:w-64"><SelectValue placeholder="Employee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>All employees</SelectItem>
            {employees?.items.map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>
                {e.first_name} {e.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="md:w-56"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>All departments</SelectItem>
            {departments?.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {creating && (
        <RecordForm
          title="New attendance record"
          onCancel={() => setCreating(false)}
          onDone={() => setCreating(false)}
        />
      )}
      {editing && (
        <RecordForm
          title={`Edit ${editing.employee.first_name} ${editing.employee.last_name}`}
          existing={editing}
          onCancel={() => setEditing(null)}
          onDone={() => setEditing(null)}
        />
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Loading…</div>
          ) : !data?.length ? (
            <div className="p-10 text-center text-muted-foreground">No records.</div>
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
                  <TableHead></TableHead>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setCreating(false); setEditing(r); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (!confirm("Delete this record?")) return;
                            try {
                              await remove.mutateAsync(r.id);
                              toast.success("Deleted");
                            } catch (err) {
                              toast.error(apiError(err));
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

function RecordForm({
  title,
  existing,
  onCancel,
  onDone,
}: {
  title: string;
  existing?: AttendanceRecord;
  onCancel: () => void;
  onDone: () => void;
}) {
  const create = useCreateAttendance();
  const update = useUpdateAttendance();
  const { data: employees } = useEmployees({ page_size: 200 });

  const form = useForm<RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: existing
      ? {
          employee_id: String(existing.employee.id),
          date: existing.date,
          check_in_at: toLocalDateTimeInput(existing.check_in_at),
          check_out_at: toLocalDateTimeInput(existing.check_out_at),
          status: "AUTO",
          note: existing.note ?? "",
        }
      : {
          employee_id: "",
          date: new Date().toISOString().slice(0, 10),
          check_in_at: "",
          check_out_at: "",
          status: "AUTO",
          note: "",
        },
  });
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = form;

  async function onSubmit(values: RecordFormValues) {
    const checkIn = values.check_in_at ? new Date(values.check_in_at).toISOString() : null;
    const checkOut = values.check_out_at ? new Date(values.check_out_at).toISOString() : null;
    const statusOverride = values.status === "AUTO" ? null : (values.status as AttendanceStatus);
    try {
      if (existing) {
        await update.mutateAsync({
          id: existing.id,
          input: {
            check_in_at: checkIn,
            check_out_at: checkOut,
            status: statusOverride,
            note: values.note || null,
          },
        });
        toast.success("Record updated");
      } else {
        await create.mutateAsync({
          employee_id: Number(values.employee_id),
          date: values.date,
          check_in_at: checkIn,
          check_out_at: checkOut,
          status: statusOverride,
          note: values.note || null,
        });
        toast.success("Record created");
      }
      onDone();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Leave status as <span className="font-medium">Auto</span> to let the server derive it from check-in /
            check-out times.
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            {!existing && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="employee_id">Employee</Label>
                <Select
                  value={watch("employee_id")}
                  onValueChange={(v) => setValue("employee_id", v, { shouldValidate: true })}
                >
                  <SelectTrigger id="employee_id"><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>
                    {employees?.items.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.first_name} {e.last_name} — {e.job_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.employee_id && (
                  <p className="text-xs text-destructive">{errors.employee_id.message}</p>
                )}
              </div>
            )}
            {!existing && (
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...register("date")} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="check_in_at">Check in</Label>
              <Input id="check_in_at" type="datetime-local" {...register("check_in_at")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check_out_at">Check out</Label>
              <Input id="check_out_at" type="datetime-local" {...register("check_out_at")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as RecordFormValues["status"])}
              >
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTO">Auto (derive from times)</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" rows={2} placeholder="Reason for correction, etc." {...register("note")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
