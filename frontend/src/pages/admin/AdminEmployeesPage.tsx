import { Pencil, Plus, Search, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { EmploymentStatusBadge } from "@/components/EmploymentStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDepartments } from "@/hooks/useDepartments";
import { useEmployees, useTerminateEmployee } from "@/hooks/useEmployees";
import { apiError } from "@/lib/api";
import type { EmploymentStatus } from "@/types/api";

const STATUS_OPTIONS: { label: string; value: EmploymentStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "On leave", value: "ON_LEAVE" },
  { label: "Terminated", value: "TERMINATED" },
];

export function AdminEmployeesPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const departmentId = params.get("department_id");
  const statusParam = (params.get("status") ?? "ALL") as EmploymentStatus | "ALL";
  const [searchInput, setSearchInput] = useState(q);

  const query = useMemo(
    () => ({
      q: q || undefined,
      department_id: departmentId ? Number(departmentId) : undefined,
      employment_status: statusParam !== "ALL" ? statusParam : undefined,
      page_size: 100,
    }),
    [q, departmentId, statusParam],
  );

  const { data, isLoading } = useEmployees(query);
  const { data: departments } = useDepartments();
  const terminate = useTerminateEmployee();

  function update(next: Record<string, string | null>) {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") merged.delete(k);
      else merged.set(k, v);
    }
    setParams(merged);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-3xl font-semibold">Employees</h1>
          <p className="text-muted-foreground">{data?.total ?? 0} on file</p>
        </div>
        <Button asChild>
          <Link to="/admin/employees/new">
            <Plus className="mr-2 h-4 w-4" /> New employee
          </Link>
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: searchInput.trim() || null });
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Name or job title"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        <Select
          value={departmentId ?? "ALL"}
          onValueChange={(v) => update({ department_id: v === "ALL" ? null : v })}
        >
          <SelectTrigger className="md:w-56"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All departments</SelectItem>
            {departments?.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusParam}
          onValueChange={(v) => update({ status: v === "ALL" ? null : v })}
        >
          <SelectTrigger className="md:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Loading…</div>
          ) : !data?.items.length ? (
            <div className="p-10 text-center text-muted-foreground">No employees match.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link to={`/directory/${e.id}`} className="font-medium hover:underline">
                        {e.first_name} {e.last_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{e.email}</p>
                    </TableCell>
                    <TableCell>{e.job_title}</TableCell>
                    <TableCell>{e.department?.name ?? "—"}</TableCell>
                    <TableCell>
                      {e.manager ? `${e.manager.first_name} ${e.manager.last_name}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{e.role}</TableCell>
                    <TableCell><EmploymentStatusBadge status={e.employment_status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/admin/employees/${e.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        {e.employment_status !== "TERMINATED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (!confirm(`Terminate ${e.first_name} ${e.last_name}?`)) return;
                              try {
                                await terminate.mutateAsync(e.id);
                                toast.success("Employee terminated");
                              } catch (err) {
                                toast.error(apiError(err));
                              }
                            }}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
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
