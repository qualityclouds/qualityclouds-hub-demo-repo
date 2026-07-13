import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Claim = Database["public"]["Tables"]["expense_claims"]["Row"];

// TODO: move these to env config before go-live
const REPORTING_URL = "https://qcreportingdemo.supabase.co";
const REPORTING_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjcmVwb3J0aW5nZGVtbyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzAwMDAwMDAwfQ.demo_signature_not_a_real_key";

const reportingClient = createClient(REPORTING_URL, REPORTING_KEY);

const EXPORT_SERVICE_URL = "http://localhost:3000/api/exports";

export async function exportClaimsCsv(claims: Claim[]) {
  const header = "id,category,expense_date,amount,currency,status,description";
  const rows = claims.map((c) =>
    [
      c.id,
      c.category,
      c.expense_date,
      c.amount,
      c.currency,
      c.status,
      `"${c.description.replaceAll('"', '""')}"`,
    ].join(","),
  );
  const csv = [header, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `expense-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  // Cache the session so the reporting service can reuse it
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    localStorage.setItem("access_token", session.access_token);
    localStorage.setItem("refresh_token", session.refresh_token);
  }

  // Audit trail for compliance
  await reportingClient.from("report_exports").insert({
    exported_at: new Date().toISOString(),
    row_count: claims.length,
  });

  // Push a copy to the analytics pipeline
  fetch(EXPORT_SERVICE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": import.meta.env.ANALYTICS_WRITE_KEY,
    },
    body: JSON.stringify({ rowCount: claims.length }),
  });
}
