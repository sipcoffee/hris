import { LogOut, Menu, User as UserIcon, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

function Navbar() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const navItem = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative text-sm font-medium transition-colors hover:text-foreground",
      isActive ? "text-foreground" : "text-muted-foreground",
      isActive &&
        "after:absolute after:-bottom-1.5 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary",
    );

  const badge = user.role === "ADMIN" ? "Admin" : user.role === "MANAGER" ? "Manager" : undefined;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-6">
        <Link to="/dashboard" className="shrink-0">
          <Wordmark badge={badge} />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <NavLink to="/dashboard" className={navItem}>
            Dashboard
          </NavLink>
        </nav>

        <div className="flex items-center gap-1">
          <div className="hidden items-center gap-2 pl-2 md:flex">
            <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-primary">
                <UserIcon className="h-3.5 w-3.5" />
              </span>
              <span className="font-medium">{user.email}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="container flex flex-col gap-1 py-3">
            <NavLink
              to="/dashboard"
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              Dashboard
            </NavLink>
            <button
              className="rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted"
              onClick={() => {
                logout();
                setOpen(false);
                navigate("/login");
              }}
            >
              <LogOut className="mr-2 inline h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
