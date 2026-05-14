import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminUsers } from "@/hooks/useAdmin";
import { formatDate } from "@/lib/utils";

export function AdminUsersPage() {
  const { data, isLoading } = useAdminUsers();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Users</h1>
        <p className="text-muted-foreground">
          Every login on the system. {data?.length ?? 0} total.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Loading…</div>
          ) : !data?.length ? (
            <div className="p-10 text-center text-muted-foreground">No users.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Linked employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.employee_name ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                    <TableCell>
                      {u.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="muted">Inactive</Badge>
                      )}
                      {u.must_change_password && (
                        <Badge variant="warning" className="ml-1">Must change pw</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(u.created_at)}</TableCell>
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
