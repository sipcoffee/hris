import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyEmployee, useUpdateMyEmployee } from "@/hooks/useEmployees";
import { apiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const schema = z.object({
  phone: z.string().max(40).optional().or(z.literal("")),
  address: z.string().max(2000).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export function MyProfilePage() {
  const { data: employee, isLoading } = useMyEmployee();
  const update = useUpdateMyEmployee();

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const { register, handleSubmit, reset, formState: { isSubmitting } } = form;

  useEffect(() => {
    if (employee) {
      reset({
        phone: employee.phone ?? "",
        address: employee.address ?? "",
        date_of_birth: employee.date_of_birth ?? "",
      });
    }
  }, [employee, reset]);

  async function onSubmit(values: FormValues) {
    try {
      await update.mutateAsync({
        phone: values.phone || null,
        address: values.address || null,
        date_of_birth: values.date_of_birth || null,
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  if (isLoading) {
    return <div className="container py-10 text-muted-foreground">Loading…</div>;
  }
  if (!employee) {
    return (
      <div className="container py-10 text-muted-foreground">
        No employee profile is linked to your account. Ask your HR admin to set one up.
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">My profile</h1>
        <p className="text-muted-foreground">Update your contact details.</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{employee.first_name} {employee.last_name}</CardTitle>
          <CardDescription>
            {employee.job_title}
            {employee.department && ` · ${employee.department.name}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
          <Readonly label="Email" value={employee.email} />
          <Readonly label="Hire date" value={formatDate(employee.hire_date)} />
          {employee.manager && (
            <Readonly
              label="Manager"
              value={`${employee.manager.first_name} ${employee.manager.last_name}`}
            />
          )}
          <Readonly label="Employment type" value={employee.employment_type} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact details</CardTitle>
          <CardDescription>Only HR admins and you can see these.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="+1 555 555 5555" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of birth</Label>
              <Input id="date_of_birth" type="date" {...register("date_of_birth")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" rows={3} {...register("address")} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" asChild>
                <Link to="/change-password">Change password</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Readonly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}
