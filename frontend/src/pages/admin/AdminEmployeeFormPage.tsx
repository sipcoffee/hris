import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { useDepartments } from "@/hooks/useDepartments";
import {
  useCreateEmployee,
  useEmployee,
  useEmployees,
  useUpdateEmployee,
} from "@/hooks/useEmployees";
import { apiError } from "@/lib/api";
import type { EmploymentStatus, EmploymentType, UserRole } from "@/types/api";

const NONE = "__NONE__";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "At least 8 characters"),
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  job_title: z.string().min(1),
  employment_type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]),
  hire_date: z.string().min(1),
  department_id: z.string().optional(),
  manager_id: z.string().optional(),
  date_of_birth: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  salary: z.string().optional().or(z.literal("")),
});

const editSchema = createSchema
  .omit({ email: true, password: true })
  .extend({
    employment_status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED"]),
    termination_date: z.string().optional().or(z.literal("")),
    is_active: z.boolean(),
  });

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

export function AdminEmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  return isEdit ? <EditForm employeeId={Number(id)} /> : <CreateForm />;
}

function CreateForm() {
  const navigate = useNavigate();
  const { data: departments } = useDepartments();
  const { data: managerSource } = useEmployees({ page_size: 100, employment_status: "ACTIVE" });
  const create = useCreateEmployee();

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      role: "EMPLOYEE",
      employment_type: "FULL_TIME",
      hire_date: new Date().toISOString().slice(0, 10),
    },
  });
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = form;

  async function onSubmit(values: CreateValues) {
    try {
      const result = await create.mutateAsync({
        email: values.email,
        password: values.password,
        role: values.role as UserRole,
        first_name: values.first_name,
        last_name: values.last_name,
        job_title: values.job_title,
        employment_type: values.employment_type as EmploymentType,
        hire_date: values.hire_date,
        department_id: values.department_id && values.department_id !== NONE ? Number(values.department_id) : null,
        manager_id: values.manager_id && values.manager_id !== NONE ? Number(values.manager_id) : null,
        date_of_birth: values.date_of_birth || null,
        phone: values.phone || null,
        address: values.address || null,
        salary: values.salary || null,
      });
      toast.success(`Created ${result.employee.first_name}. Temp password: ${result.temporary_password}`);
      navigate(`/admin/employees`);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <Wrapper title="New employee" subtitle="Provisions a user + employee record.">
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <Section title="Account">
          <Grid>
            <FieldText label="Email" error={errors.email?.message}>
              <Input type="email" {...register("email")} />
            </FieldText>
            <FieldText label="Temporary password" error={errors.password?.message}>
              <Input type="text" {...register("password")} />
            </FieldText>
            <FieldText label="Role">
              <Select value={watch("role")} onValueChange={(v) => setValue("role", v as UserRole, { shouldValidate: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </FieldText>
          </Grid>
        </Section>

        <Section title="Identity">
          <Grid>
            <FieldText label="First name" error={errors.first_name?.message}>
              <Input {...register("first_name")} />
            </FieldText>
            <FieldText label="Last name" error={errors.last_name?.message}>
              <Input {...register("last_name")} />
            </FieldText>
            <FieldText label="Date of birth">
              <Input type="date" {...register("date_of_birth")} />
            </FieldText>
            <FieldText label="Phone">
              <Input {...register("phone")} />
            </FieldText>
            <FieldText label="Address" full>
              <Textarea rows={2} {...register("address")} />
            </FieldText>
          </Grid>
        </Section>

        <Section title="Employment">
          <Grid>
            <FieldText label="Job title" error={errors.job_title?.message}>
              <Input {...register("job_title")} />
            </FieldText>
            <FieldText label="Employment type">
              <Select
                value={watch("employment_type")}
                onValueChange={(v) => setValue("employment_type", v as EmploymentType, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full-time</SelectItem>
                  <SelectItem value="PART_TIME">Part-time</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                  <SelectItem value="INTERN">Intern</SelectItem>
                </SelectContent>
              </Select>
            </FieldText>
            <FieldText label="Hire date" error={errors.hire_date?.message}>
              <Input type="date" {...register("hire_date")} />
            </FieldText>
            <FieldText label="Department">
              <Select
                value={watch("department_id") ?? NONE}
                onValueChange={(v) => setValue("department_id", v)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldText>
            <FieldText label="Manager">
              <Select
                value={watch("manager_id") ?? NONE}
                onValueChange={(v) => setValue("manager_id", v)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {managerSource?.items.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.first_name} {e.last_name} — {e.job_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldText>
            <FieldText label="Salary (annual)">
              <Input type="number" step="0.01" {...register("salary")} />
            </FieldText>
          </Grid>
        </Section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" asChild>
            <Link to="/admin/employees">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create employee"}
          </Button>
        </div>
      </form>
    </Wrapper>
  );
}

function EditForm({ employeeId }: { employeeId: number }) {
  const navigate = useNavigate();
  const { data: employee, isLoading } = useEmployee(employeeId);
  const { data: departments } = useDepartments();
  const { data: managerSource } = useEmployees({ page_size: 100 });
  const update = useUpdateEmployee(employeeId);

  const form = useForm<EditValues>({ resolver: zodResolver(editSchema) });
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = form;

  useEffect(() => {
    if (!employee) return;
    reset({
      first_name: employee.first_name,
      last_name: employee.last_name,
      job_title: employee.job_title,
      role: employee.role,
      employment_type: employee.employment_type,
      employment_status: employee.employment_status,
      hire_date: employee.hire_date,
      termination_date: employee.termination_date ?? "",
      department_id: employee.department ? String(employee.department.id) : NONE,
      manager_id: employee.manager ? String(employee.manager.id) : NONE,
      date_of_birth: employee.date_of_birth ?? "",
      phone: employee.phone ?? "",
      address: employee.address ?? "",
      salary: employee.salary ?? "",
      is_active: employee.is_active,
    });
  }, [employee, reset]);

  if (isLoading) return <Wrapper title="Edit employee">Loading…</Wrapper>;
  if (!employee) return <Wrapper title="Edit employee">Not found.</Wrapper>;

  async function onSubmit(values: EditValues) {
    try {
      await update.mutateAsync({
        first_name: values.first_name,
        last_name: values.last_name,
        job_title: values.job_title,
        role: values.role as UserRole,
        employment_type: values.employment_type as EmploymentType,
        employment_status: values.employment_status as EmploymentStatus,
        hire_date: values.hire_date,
        termination_date: values.termination_date || null,
        department_id: values.department_id && values.department_id !== NONE ? Number(values.department_id) : null,
        manager_id: values.manager_id && values.manager_id !== NONE ? Number(values.manager_id) : null,
        date_of_birth: values.date_of_birth || null,
        phone: values.phone || null,
        address: values.address || null,
        salary: values.salary || null,
        is_active: values.is_active,
      });
      toast.success("Employee updated");
      navigate("/admin/employees");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <Wrapper title={`Edit ${employee.first_name} ${employee.last_name}`} subtitle={employee.email}>
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <Section title="Identity">
          <Grid>
            <FieldText label="First name" error={errors.first_name?.message}>
              <Input {...register("first_name")} />
            </FieldText>
            <FieldText label="Last name" error={errors.last_name?.message}>
              <Input {...register("last_name")} />
            </FieldText>
            <FieldText label="Date of birth">
              <Input type="date" {...register("date_of_birth")} />
            </FieldText>
            <FieldText label="Phone">
              <Input {...register("phone")} />
            </FieldText>
            <FieldText label="Address" full>
              <Textarea rows={2} {...register("address")} />
            </FieldText>
          </Grid>
        </Section>

        <Section title="Employment">
          <Grid>
            <FieldText label="Role">
              <Select value={watch("role")} onValueChange={(v) => setValue("role", v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </FieldText>
            <FieldText label="Job title" error={errors.job_title?.message}>
              <Input {...register("job_title")} />
            </FieldText>
            <FieldText label="Employment type">
              <Select
                value={watch("employment_type")}
                onValueChange={(v) => setValue("employment_type", v as EmploymentType)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full-time</SelectItem>
                  <SelectItem value="PART_TIME">Part-time</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                  <SelectItem value="INTERN">Intern</SelectItem>
                </SelectContent>
              </Select>
            </FieldText>
            <FieldText label="Status">
              <Select
                value={watch("employment_status")}
                onValueChange={(v) => setValue("employment_status", v as EmploymentStatus)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ON_LEAVE">On leave</SelectItem>
                  <SelectItem value="TERMINATED">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </FieldText>
            <FieldText label="Hire date" error={errors.hire_date?.message}>
              <Input type="date" {...register("hire_date")} />
            </FieldText>
            <FieldText label="Termination date">
              <Input type="date" {...register("termination_date")} />
            </FieldText>
            <FieldText label="Department">
              <Select
                value={watch("department_id") ?? NONE}
                onValueChange={(v) => setValue("department_id", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldText>
            <FieldText label="Manager">
              <Select
                value={watch("manager_id") ?? NONE}
                onValueChange={(v) => setValue("manager_id", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {managerSource?.items
                    .filter((e) => e.id !== employee.id)
                    .map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.first_name} {e.last_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </FieldText>
            <FieldText label="Salary (annual)">
              <Input type="number" step="0.01" {...register("salary")} />
            </FieldText>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("is_active")} className="h-4 w-4 rounded border-input" />
              Account can sign in
            </label>
          </Grid>
        </Section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" asChild>
            <Link to="/admin/employees">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Wrapper>
  );
}

function Wrapper({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/admin/employees">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Employees
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function FieldText({
  label,
  error,
  children,
  full,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
