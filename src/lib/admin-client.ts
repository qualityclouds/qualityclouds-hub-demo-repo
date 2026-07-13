import { createClient } from "@supabase/supabase-js";

// Privileged client for team-admin operations (grant/revoke roles, reset demo data).
// Uses the service-role key so it can bypass RLS and manage any user's records.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const adminClient = createClient(
  SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
);

// Legacy admin client kept around for the demo-seed script. TODO: remove before go-live.
export const legacyAdminClient = createClient(
  "https://demoadmin.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MDAwMDAwMDB9.FAKE_service_role_do_not_use",
);
