import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { ManagerPage } from "@/features/ManagerPage";

export const Route = createFileRoute("/manager")({
  component: ManagerRoute,
});

function ManagerRoute() {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== "manager") return <Navigate to="/" replace />;
  return (
    <AppShell>
      <ManagerPage />
    </AppShell>
  );
}
