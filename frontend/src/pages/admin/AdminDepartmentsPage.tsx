import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useUpdateDepartment,
} from "@/hooks/useDepartments";
import { apiError } from "@/lib/api";
import type { Department } from "@/types/api";

const schema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export function AdminDepartmentsPage() {
  const { data: departments, isLoading } = useDepartments();
  const create = useCreateDepartment();
  const remove = useDeleteDepartment();

  const [editing, setEditing] = useState<Department | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Departments</h1>
          <p className="text-muted-foreground">Top-level groupings for the org.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> New department
        </Button>
      </div>

      {creating && (
        <DepartmentForm
          title="New department"
          onCancel={() => setCreating(false)}
          onSubmit={async (values) => {
            try {
              await create.mutateAsync({ name: values.name, description: values.description || null });
              toast.success("Department created");
              setCreating(false);
            } catch (err) {
              toast.error(apiError(err));
            }
          }}
        />
      )}
      {editing && (
        <DepartmentEditForm
          department={editing}
          onCancel={() => setEditing(null)}
          onDone={() => setEditing(null)}
        />
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Loading…</div>
          ) : !departments?.length ? (
            <div className="p-10 text-center text-muted-foreground">No departments yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-muted-foreground">{d.description ?? "—"}</TableCell>
                    <TableCell>
                      {d.head_employee
                        ? `${d.head_employee.first_name} ${d.head_employee.last_name}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular">{d.employee_count}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditing(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (!confirm(`Delete ${d.name}?`)) return;
                            try {
                              await remove.mutateAsync(d.id);
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

function DepartmentForm({
  title,
  initial,
  onCancel,
  onSubmit,
}: {
  title: string;
  initial?: { name: string; description: string | null };
  onCancel: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial?.name ?? "", description: initial?.description ?? "" },
  });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Departments group employees on the org chart.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DepartmentEditForm({
  department,
  onCancel,
  onDone,
}: {
  department: Department;
  onCancel: () => void;
  onDone: () => void;
}) {
  const update = useUpdateDepartment(department.id);

  useEffect(() => undefined, []);

  return (
    <DepartmentForm
      title={`Edit ${department.name}`}
      initial={{ name: department.name, description: department.description }}
      onCancel={onCancel}
      onSubmit={async (values) => {
        try {
          await update.mutateAsync({ name: values.name, description: values.description || null });
          toast.success("Department updated");
          onDone();
        } catch (err) {
          toast.error(apiError(err));
        }
      }}
    />
  );
}
