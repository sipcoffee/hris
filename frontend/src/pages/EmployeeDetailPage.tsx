import { ArrowLeft, Building2, Mail, Phone, User as UserIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { EmploymentStatusBadge } from "@/components/EmploymentStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmployee } from "@/hooks/useEmployees";
import { formatDate } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERN: "Intern",
};

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const employeeId = id ? Number(id) : undefined;
  const { data: employee, isLoading, isError } = useEmployee(employeeId);

  if (isLoading) {
    return <div className="container py-10 text-muted-foreground">Loading…</div>;
  }
  if (isError || !employee) {
    return (
      <div className="container py-10 text-muted-foreground">
        <p>Employee not found.</p>
        <Button variant="link" asChild className="mt-2 p-0">
          <Link to="/directory">Back to directory</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/directory">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Directory
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                {employee.first_name[0]}{employee.last_name[0]}
              </div>
              <div className="flex-1">
                <CardTitle className="font-display text-2xl">
                  {employee.first_name} {employee.last_name}
                </CardTitle>
                <p className="text-muted-foreground">{employee.job_title}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <EmploymentStatusBadge status={employee.employment_status} />
                  <span className="rounded-full border bg-background px-2.5 py-0.5 text-xs">
                    {TYPE_LABEL[employee.employment_type] ?? employee.employment_type}
                  </span>
                  {employee.department && (
                    <span className="rounded-full border bg-background px-2.5 py-0.5 text-xs">
                      <Building2 className="-mt-0.5 mr-1 inline h-3 w-3" />
                      {employee.department.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field icon={<Mail className="h-4 w-4" />} label="Email" value={employee.email} />
            {employee.phone && (
              <Field icon={<Phone className="h-4 w-4" />} label="Phone" value={employee.phone} />
            )}
            {employee.manager && (
              <Field
                icon={<UserIcon className="h-4 w-4" />}
                label="Manager"
                value={`${employee.manager.first_name} ${employee.manager.last_name}`}
              />
            )}
            <Field label="Hired" value={formatDate(employee.hire_date)} />
            {employee.termination_date && (
              <Field label="Terminated" value={formatDate(employee.termination_date)} />
            )}
            {employee.date_of_birth && (
              <Field label="Date of birth" value={formatDate(employee.date_of_birth)} />
            )}
            {employee.address && <Field label="Address" value={employee.address} />}
          </CardContent>
        </Card>

        {employee.salary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Compensation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-semibold tabular">${employee.salary}</p>
              <p className="text-xs text-muted-foreground">Annual base</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-sm">
        {icon}
        {value}
      </p>
    </div>
  );
}
