import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { IntegrationsPage } from "@/features/IntegrationsPage";

export const Route = createFileRoute("/integrations")({
  component: IntegrationsRoute,
});

function IntegrationsRoute() {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== "manager") return <Navigate to="/" replace />;
  return (
    <AppShell>
      <IntegrationsPage />
    </AppShell>
  );
}
