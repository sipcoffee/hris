import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AppShell } from "@/components/layout/AppShell";
import { ChangePasswordPage } from "@/pages/ChangePasswordPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DirectoryPage } from "@/pages/DirectoryPage";
import { EmployeeDetailPage } from "@/pages/EmployeeDetailPage";
import { LoginPage } from "@/pages/LoginPage";
import { MyProfilePage } from "@/pages/MyProfilePage";
import { AdminDepartmentsPage } from "@/pages/admin/AdminDepartmentsPage";
import { AdminEmployeeFormPage } from "@/pages/admin/AdminEmployeeFormPage";
import { AdminEmployeesPage } from "@/pages/admin/AdminEmployeesPage";
import { AdminLeaveTypesPage } from "@/pages/admin/AdminLeaveTypesPage";
import { AdminOverviewPage } from "@/pages/admin/AdminOverviewPage";
import { useAuthStore } from "@/stores/auth";

export function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route path="/directory/:id" element={<EmployeeDetailPage />} />
        <Route path="/me" element={<MyProfilePage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="ADMIN">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="employees" element={<AdminEmployeesPage />} />
        <Route path="employees/new" element={<AdminEmployeeFormPage />} />
        <Route path="employees/:id/edit" element={<AdminEmployeeFormPage />} />
        <Route path="departments" element={<AdminDepartmentsPage />} />
        <Route path="leave-types" element={<AdminLeaveTypesPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
