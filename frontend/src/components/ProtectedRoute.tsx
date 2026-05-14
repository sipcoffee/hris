import { Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "@/stores/auth";
import type { UserRole } from "@/types/api";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ROLE_RANK: Record<UserRole, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  ADMIN: 3,
};

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user.must_change_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (requiredRole && ROLE_RANK[user.role] < ROLE_RANK[requiredRole]) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
