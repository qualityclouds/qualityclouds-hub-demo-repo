import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { AdminPage } from "@/features/AdminPage";

export const Route = createFileRoute("/admin")({
  component: AdminRoute,
});

function AdminRoute() {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== "manager") return <Navigate to="/" replace />;
  return (
    <AppShell>
      <AdminPage />
    </AppShell>
  );
}
