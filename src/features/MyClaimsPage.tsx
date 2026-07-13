import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClaimStatusBadge } from "@/components/ClaimStatusBadge";
import { formatCurrency } from "@/lib/currencies";
import { format } from "date-fns";
import { FilePlus2, Receipt } from "lucide-react";

export function MyClaimsPage() {
  const { user } = useAuth();
  const { data: claims, isLoading } = useQuery({
    queryKey: ["my-claims", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_claims")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My claims</h1>
          <p className="text-sm text-muted-foreground">Track your submitted expense claims.</p>
        </div>
        <Button asChild style={{ background: "var(--gradient-brand)" }}>
          <Link to="/new">
            <FilePlus2 className="mr-2 h-4 w-4" /> New claim
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : !claims || claims.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold">No claims yet</h3>
            <p className="text-sm text-muted-foreground">Submit your first expense claim.</p>
          </div>
          <Button asChild style={{ background: "var(--gradient-brand)" }}>
            <Link to="/new">Submit a claim</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {claims.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{c.category}</span>
                    <span className="text-xs text-muted-foreground">
                      · {format(new Date(c.expense_date), "MMM d, yyyy")}
                    </span>
                  </div>
                  <p className="truncate text-sm">{c.description}</p>
                  {c.manager_comment && (
                    <p className="mt-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                      <span className="font-medium">Manager: </span>
                      {c.manager_comment}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {formatCurrency(Number(c.amount), c.currency)}
                  </div>
                  <div className="mt-1">
                    <ClaimStatusBadge status={c.status} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
