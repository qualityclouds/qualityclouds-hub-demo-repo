import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { NewClaimPage } from "@/features/NewClaimPage";

export const Route = createFileRoute("/new")({
  component: NewRoute,
});

function NewRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <AppShell>
      <NewClaimPage />
    </AppShell>
  );
}
