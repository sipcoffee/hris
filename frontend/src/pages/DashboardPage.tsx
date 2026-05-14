import { ArrowRight, Building2, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { LeaveBalanceWidget } from "@/components/leave/LeaveBalanceWidget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  const greeting = user.employee
    ? `Hi, ${user.employee.first_name}`
    : `Hi, ${user.email}`;

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold">{greeting}</h1>
        <p className="text-muted-foreground">
          {ROLE_LABEL[user.role] ?? user.role}
          {user.employee?.department && ` · ${user.employee.department.name}`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="transition-colors hover:border-primary/40">
          <CardHeader>
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Directory</CardTitle>
            <CardDescription>Browse your colleagues.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="ghost" className="-ml-3">
              <Link to="/directory">Open <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:border-primary/40">
          <CardHeader>
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>My profile</CardTitle>
            <CardDescription>Update contact details.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="ghost" className="-ml-3">
              <Link to="/me">Open <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        {user.role === "ADMIN" && (
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader>
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Admin</CardTitle>
              <CardDescription>Manage employees and policies.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="ghost" className="-ml-3">
                <Link to="/admin">Open <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {user.employee && (
        <div className="mt-8">
          <LeaveBalanceWidget />
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Coming next</CardTitle>
          <CardDescription>
            Step 3 (leave types and balances) is live. Leave requests with manager approval ship next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Leave requests with manager approval</li>
            <li>Attendance check-in / check-out</li>
            <li>Announcements and admin dashboard stats</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
