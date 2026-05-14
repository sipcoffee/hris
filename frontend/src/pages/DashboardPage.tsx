import { ArrowRight, CalendarRange, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { AnnouncementsWidget } from "@/components/announcements/AnnouncementsWidget";
import { CheckInCard } from "@/components/attendance/CheckInCard";
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

  const canManage = user.role === "MANAGER" || user.role === "ADMIN";

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold">{greeting}</h1>
        <p className="text-muted-foreground">
          {ROLE_LABEL[user.role] ?? user.role}
          {user.employee?.department && ` · ${user.employee.department.name}`}
        </p>
      </div>

      {user.employee && (
        <div className="mb-6">
          <CheckInCard />
        </div>
      )}

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
            <CalendarRange className="h-5 w-5 text-primary" />
            <CardTitle>Time off</CardTitle>
            <CardDescription>Request leave and track your balances.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="ghost" className="-ml-3">
              <Link to="/leave">Open <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        {canManage ? (
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader>
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>{user.role === "ADMIN" ? "Admin" : "Team"}</CardTitle>
              <CardDescription>
                {user.role === "ADMIN"
                  ? "Manage employees, policies, and requests."
                  : "Review team leave and attendance."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="ghost" className="-ml-3">
                <Link to={user.role === "ADMIN" ? "/admin" : "/team/leave"}>
                  Open <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader>
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>My profile</CardTitle>
              <CardDescription>Update contact details.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="ghost" className="-ml-3">
                <Link to="/me">Open <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {user.employee && <LeaveBalanceWidget />}
        <AnnouncementsWidget />
      </div>
    </div>
  );
}
