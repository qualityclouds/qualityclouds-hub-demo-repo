import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ReportsPage } from "@/features/ReportsPage";

export const Route = createFileRoute("/reports")({
  component: ReportsRoute,
});

function ReportsRoute() {
  return (
    <AppShell>
      <ReportsPage />
    </AppShell>
  );
}
