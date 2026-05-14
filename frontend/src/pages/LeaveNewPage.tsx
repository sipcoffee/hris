import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import { useMyLeaveBalances } from "@/hooks/useLeaveBalances";
import { useCreateLeaveRequest } from "@/hooks/useLeaveRequests";
import { useLeaveTypes } from "@/hooks/useLeaveTypes";
import { apiError } from "@/lib/api";

const schema = z
  .object({
    leave_type_id: z.string().min(1, "Required"),
    start_date: z.string().min(1, "Required"),
    end_date: z.string().min(1, "Required"),
    reason: z.string().max(2000).optional().or(z.literal("")),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "End date cannot be before start date",
    path: ["end_date"],
  });

type FormValues = z.infer<typeof schema>;

function businessDaysBetween(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  if (end < start) return 0;
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function LeaveNewPage() {
  const navigate = useNavigate();
  const { data: types } = useLeaveTypes();
  const { data: balances } = useMyLeaveBalances();
  const create = useCreateLeaveRequest();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { leave_type_id: "", start_date: "", end_date: "", reason: "" },
  });
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = form;

  const leaveTypeId = watch("leave_type_id");
  const startDate = watch("start_date");
  const endDate = watch("end_date");

  const activeTypes = useMemo(() => types?.filter((t) => t.is_active) ?? [], [types]);
  const selectedBalance = useMemo(
    () => balances?.find((b) => String(b.leave_type.id) === leaveTypeId),
    [balances, leaveTypeId],
  );
  const days = useMemo(() => businessDaysBetween(startDate, endDate), [startDate, endDate]);
  const remaining = selectedBalance ? Number(selectedBalance.remaining_days) : null;
  const insufficient =
    selectedBalance != null &&
    selectedBalance.leave_type.is_paid &&
    remaining != null &&
    days > remaining;

  async function onSubmit(values: FormValues) {
    try {
      await create.mutateAsync({
        leave_type_id: Number(values.leave_type_id),
        start_date: values.start_date,
        end_date: values.end_date,
        reason: values.reason || undefined,
      });
      toast.success("Leave request submitted");
      navigate("/leave");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <div className="container max-w-2xl py-8">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/leave">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-2xl">Request leave</CardTitle>
          </div>
          <CardDescription>Weekends are excluded automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="leave_type_id">Leave type</Label>
              <Select value={leaveTypeId} onValueChange={(v) => setValue("leave_type_id", v, { shouldValidate: true })}>
                <SelectTrigger id="leave_type_id">
                  <SelectValue placeholder="Choose a type…" />
                </SelectTrigger>
                <SelectContent>
                  {activeTypes.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name} {t.is_paid ? "" : "(unpaid)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.leave_type_id && (
                <p className="text-xs text-destructive">{errors.leave_type_id.message}</p>
              )}
              {selectedBalance && (
                <p className="text-xs text-muted-foreground">
                  {selectedBalance.remaining_days} day(s) remaining · {selectedBalance.used_days} used /{" "}
                  {selectedBalance.allocated_days} allocated this year
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start date</Label>
                <Input id="start_date" type="date" {...register("start_date")} />
                {errors.start_date && (
                  <p className="text-xs text-destructive">{errors.start_date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End date</Label>
                <Input id="end_date" type="date" {...register("end_date")} />
                {errors.end_date && (
                  <p className="text-xs text-destructive">{errors.end_date.message}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Business days requested</span>
                <span className="font-display text-2xl font-semibold tabular">{days}</span>
              </div>
              {insufficient && (
                <p className="mt-1 text-xs text-destructive">
                  Exceeds remaining balance ({remaining} day{remaining === 1 ? "" : "s"}).
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" rows={3} placeholder="Optional context for your manager" {...register("reason")} />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" asChild>
                <Link to="/leave">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting || insufficient || days === 0}>
                {isSubmitting ? "Submitting…" : "Submit request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
