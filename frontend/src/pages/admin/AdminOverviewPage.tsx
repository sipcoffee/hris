import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDepartments } from "@/hooks/useDepartments";
import { useEmployees } from "@/hooks/useEmployees";

export function AdminOverviewPage() {
  const { data: employees } = useEmployees({ page_size: 1 });
  const { data: active } = useEmployees({ page_size: 1, employment_status: "ACTIVE" });
  const { data: onLeave } = useEmployees({ page_size: 1, employment_status: "ON_LEAVE" });
  const { data: departments } = useDepartments();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Admin</h1>
        <p className="text-muted-foreground">Manage employees and the org structure.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total headcount" value={employees?.total ?? 0} />
        <StatCard label="Active" value={active?.total ?? 0} />
        <StatCard label="On leave" value={onLeave?.total ?? 0} />
        <StatCard label="Departments" value={departments?.length ?? 0} />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>Common admin workflows.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/admin/employees/new">New employee</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/employees">Manage employees</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/departments">Manage departments</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-display text-3xl tabular">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
