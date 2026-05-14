import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateLeaveType,
  useDeleteLeaveType,
  useLeaveTypes,
  useUpdateLeaveType,
} from "@/hooks/useLeaveTypes";
import { apiError } from "@/lib/api";
import type { LeaveType } from "@/types/api";

const schema = z.object({
  name: z.string().min(1, "Required").max(80),
  default_days_per_year: z
    .string()
    .min(1, "Required")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Must be a non-negative number"),
  is_paid: z.boolean(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function AdminLeaveTypesPage() {
  const { data: types, isLoading } = useLeaveTypes();
  const create = useCreateLeaveType();
  const remove = useDeleteLeaveType();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Leave types</h1>
          <p className="text-muted-foreground">Annual, sick, unpaid, and other policies.</p>
        </div>
        <Button onClick={() => { setEditing(null); setCreating(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New leave type
        </Button>
      </div>

      {creating && (
        <LeaveTypeForm
          title="New leave type"
          submitLabel="Create"
          onCancel={() => setCreating(false)}
          onSubmit={async (values) => {
            try {
              await create.mutateAsync({
                name: values.name,
                default_days_per_year: values.default_days_per_year,
                is_paid: values.is_paid,
                is_active: values.is_active,
              });
              toast.success("Leave type created");
              setCreating(false);
            } catch (err) {
              toast.error(apiError(err));
            }
          }}
        />
      )}

      {editing && (
        <EditForm
          leaveType={editing}
          onCancel={() => setEditing(null)}
          onDone={() => setEditing(null)}
        />
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Loading…</div>
          ) : !types?.length ? (
            <div className="p-10 text-center text-muted-foreground">No leave types yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Default days / year</TableHead>
                  <TableHead>Paid?</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-right tabular">{t.default_days_per_year}</TableCell>
                    <TableCell>
                      <Badge variant={t.is_paid ? "success" : "muted"}>
                        {t.is_paid ? "Paid" : "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? "success" : "muted"}>
                        {t.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setCreating(false); setEditing(t); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (!confirm(`Delete ${t.name}? Existing balances will block this.`)) return;
                            try {
                              await remove.mutateAsync(t.id);
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

function EditForm({
  leaveType,
  onCancel,
  onDone,
}: {
  leaveType: LeaveType;
  onCancel: () => void;
  onDone: () => void;
}) {
  const update = useUpdateLeaveType(leaveType.id);
  return (
    <LeaveTypeForm
      title={`Edit ${leaveType.name}`}
      submitLabel="Save"
      defaults={{
        name: leaveType.name,
        default_days_per_year: leaveType.default_days_per_year,
        is_paid: leaveType.is_paid,
        is_active: leaveType.is_active,
      }}
      onCancel={onCancel}
      onSubmit={async (values) => {
        try {
          await update.mutateAsync({
            name: values.name,
            default_days_per_year: values.default_days_per_year,
            is_paid: values.is_paid,
            is_active: values.is_active,
          });
          toast.success("Leave type updated");
          onDone();
        } catch (err) {
          toast.error(apiError(err));
        }
      }}
    />
  );
}

function LeaveTypeForm({
  title,
  submitLabel,
  defaults,
  onCancel,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  defaults?: FormValues;
  onCancel: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults ?? {
      name: "",
      default_days_per_year: "0",
      is_paid: true,
      is_active: true,
    },
  });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Newly-created types are allocated to future employees automatically. Existing employees
            can be allocated manually via the balance adjust endpoint.
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_days_per_year">Default days per year</Label>
              <Input
                id="default_days_per_year"
                type="number"
                step="0.5"
                min="0"
                {...register("default_days_per_year")}
              />
              {errors.default_days_per_year && (
                <p className="text-xs text-destructive">{errors.default_days_per_year.message}</p>
              )}
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("is_paid")} className="h-4 w-4 rounded border-input" />
              Paid
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("is_active")} className="h-4 w-4 rounded border-input" />
              Active
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
