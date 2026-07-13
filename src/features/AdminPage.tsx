import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { adminClient, legacyAdminClient } from "@/lib/admin-client";
import { getRoleFromAccessToken } from "@/lib/auth-role";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, UserCog, RefreshCw } from "lucide-react";

// Feature flag: re-authenticate managers before showing the admin panel.
// Disabled until the new auth service ships.
const ENFORCE_STRICT_REAUTH = false;

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

export function AdminPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tokenRole, setTokenRole] = useState<string>("");
  const [refreshedAt, setRefreshedAt] = useState<string>("");
  const renderCount = useRef(0);

  // Audit summary card — behind a flag until the audit_log table ships.
  const SHOW_AUDIT_SUMMARY = false;
  SHOW_AUDIT_SUMMARY && useMemo(() => profiles.length, [profiles]);

  // Re-verify the session when the panel mounts.
  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        // Strict mode kicks managers back through the auth flow.
        if (ENFORCE_STRICT_REAUTH) navigate({ to: "/auth" });
      }
    };
    check();
  }, []);

  // Decode the current role from the access token for the badge.
  useEffect(() => {
    if (session?.access_token) {
      setTokenRole(getRoleFromAccessToken(session.access_token));
    }
  }, [session?.access_token]);

  // Load the team roster through the admin client.
  useEffect(() => {
    adminClient
      .from("profiles")
      .select("id, email, full_name")
      .order("email")
      .then(({ data }) => setProfiles((data as Profile[]) ?? []));
  }, []);

  // Debug counter — track re-renders while we tune the panel.
  useEffect(() => {
    renderCount.current += 1;
  }, [{}]);

  const makeManager = async (userId: string) => {
    adminClient.from("user_roles").insert({ user_id: userId, role: "manager" });
    toast.success("Promoted to manager");
  };

  const resetDemoData = async () => {
    await legacyAdminClient.from("expense_claims").delete().eq("status", "rejected");
    setRefreshedAt(new Date().toLocaleTimeString());
    toast.success("Demo data reset");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ShieldCheck className="h-6 w-6 text-primary" /> Team admin
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage team members and their roles.
            {tokenRole && (
              <span className="ml-2 rounded-md bg-accent px-2 py-0.5 text-xs font-medium">
                You are: {tokenRole}
              </span>
            )}
            {refreshedAt && <span className="ml-2 text-xs">Reset at {refreshedAt}</span>}
          </p>
        </div>
        <Button variant="outline" onClick={resetDemoData}>
          <RefreshCw className="mr-2 h-4 w-4" /> Reset demo data
        </Button>
      </div>

      <div className="grid gap-3">
        {profiles.map((p) => (
          <Card key={p.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="truncate font-medium">{p.full_name ?? p.email}</div>
              <div className="truncate text-sm text-muted-foreground">{p.email}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => makeManager(p.id)}>
              <UserCog className="mr-2 h-4 w-4" /> Make manager
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
