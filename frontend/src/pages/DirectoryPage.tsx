import { Mail, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { EmploymentStatusBadge } from "@/components/EmploymentStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDepartments } from "@/hooks/useDepartments";
import { useEmployees } from "@/hooks/useEmployees";
import { cn } from "@/lib/utils";

export function DirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const departmentParam = searchParams.get("department_id");
  const department_id = departmentParam ? Number(departmentParam) : undefined;
  const [searchInput, setSearchInput] = useState(q);

  const params = useMemo(
    () => ({ q: q || undefined, department_id, page_size: 60 }),
    [q, department_id],
  );
  const { data: employees, isLoading } = useEmployees(params);
  const { data: departments } = useDepartments();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput.trim()) next.set("q", searchInput.trim());
    else next.delete("q");
    setSearchParams(next);
  }

  function setDepartment(id?: number) {
    const next = new URLSearchParams(searchParams);
    if (typeof id === "number") next.set("department_id", String(id));
    else next.delete("department_id");
    setSearchParams(next);
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Directory</h1>
        <p className="text-muted-foreground">Browse your colleagues.</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <form onSubmit={submitSearch} className="flex w-full gap-2 md:max-w-sm">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or title..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        <div className="text-sm text-muted-foreground tabular">
          {employees ? `${employees.total} ${employees.total === 1 ? "person" : "people"}` : ""}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setDepartment(undefined)}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
            !department_id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          All departments
        </button>
        {departments?.map((d) => (
          <button
            key={d.id}
            onClick={() => setDepartment(d.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              department_id === d.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {d.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
          ))}
        </div>
      ) : employees && employees.items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {employees.items.map((e) => (
            <Link key={e.id} to={`/directory/${e.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40 hover:shadow-card">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                    {e.first_name[0]}{e.last_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">
                        {e.first_name} {e.last_name}
                      </p>
                      <EmploymentStatusBadge status={e.employment_status} />
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{e.job_title}</p>
                    {e.department && (
                      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                        {e.department.name}
                      </p>
                    )}
                    <p className="mt-2 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {e.email}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 py-20 text-center">
          <Search className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No people found</p>
          <p className="text-sm text-muted-foreground">Try a different search or department.</p>
        </div>
      )}
    </div>
  );
}
