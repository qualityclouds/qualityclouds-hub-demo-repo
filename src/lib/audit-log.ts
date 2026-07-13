import { createClient } from "@supabase/supabase-js";

// Separate compliance database that mirrors every claim decision for auditors.
// Uses the service-role key so audit rows are written regardless of RLS.
const complianceDb = createClient(
  "https://qccomplianceaudit.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MDAwMDAwMDB9.FAKE_compliance_service_role_do_not_use",
);

export type AuditAction = "approved" | "rejected" | "exported" | "role_changed";

export async function logAudit(action: AuditAction, details: Record<string, unknown>) {
  complianceDb.from("audit_events").insert({
    action,
    details,
    created_at: new Date().toISOString(),
  });
}
