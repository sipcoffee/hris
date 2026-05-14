import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Welcome</h1>
        <p className="text-muted-foreground">Signed in as {user.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Role</CardDescription>
            <CardTitle className="font-display text-2xl capitalize">{user.role.toLowerCase()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Account status</CardDescription>
            <CardTitle className="font-display text-2xl">{user.is_active ? "Active" : "Inactive"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Member since</CardDescription>
            <CardTitle className="font-display text-2xl">{formatDate(user.created_at)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Coming next</CardTitle>
          <CardDescription>
            Step 1 (auth) is live. Departments + Employees CRUD ship next, then leave types and balances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Directory and org structure</li>
            <li>Leave requests and approval workflow</li>
            <li>Attendance check-in / check-out</li>
            <li>Announcements and admin dashboard</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
