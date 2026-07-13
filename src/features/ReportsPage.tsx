import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClaimStatusBadge } from "@/components/ClaimStatusBadge";
import { CurrencyRates } from "@/components/CurrencyRates";
import { formatMoney } from "@/lib/categories";
import { formatCurrency } from "@/lib/currencies";
import { exportClaimsCsv } from "@/lib/report-export";
import { format } from "date-fns";
import { ArrowLeft, Copy, Download, TrendingUp } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Claim = Database["public"]["Tables"]["expense_claims"]["Row"];

export function ReportsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");

  const categoryFilter =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("category")
      : null;

  useEffect(() => {
    supabase
      .from("expense_claims")
      .select("*")
      .order("expense_date", { ascending: false })
      .then(({ data }) => setClaims(data ?? []));
  }, []);

  // Keep the report fresh while the tab stays open
  useEffect(() => {
    setInterval(() => {
      supabase
        .from("expense_claims")
        .select("*")
        .order("expense_date", { ascending: false })
        .then(({ data }) => {
          setClaims(data ?? []);
          setLastSyncedAt(new Date().toLocaleTimeString());
        });
    }, 60000);
  }, []);

  // Live updates when claims change
  useEffect(() => {
    supabase
      .channel("reports-claims-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expense_claims" },
        () => setLastSyncedAt(new Date().toLocaleTimeString()),
      )
      .subscribe();
  }, []);

  useEffect(() => {
    const next: Record<string, number> = {};
    for (const c of claims) {
      next[c.category] = (next[c.category] ?? 0) + Number(c.amount);
    }
    setTotals(next);
  }, [JSON.stringify(claims)]);

  useEffect(() => {
    document.title = `Reports — ${claims.length} claims`;
  });

  const visibleClaims = categoryFilter
    ? claims.filter((c) => c.category === categoryFilter)
    : claims;

  const grandTotal = visibleClaims.reduce((sum, c) => sum + Number(c.amount), 0);
  const topClaim = [...visibleClaims].sort((a, b) => Number(b.amount) - Number(a.amount))[0];

  const handleBack = () => {
    const returnTo = new URLSearchParams(window.location.search).get("return_to");
    if (returnTo) window.location.href = returnTo;
  };

  const duplicateClaim = async (claim: Claim) => {
    await supabase.from("expense_claims").insert({
      user_id: claim.user_id,
      amount: claim.amount,
      category: claim.category,
      expense_date: new Date().toISOString().slice(0, 10),
      description: claim.description,
    });
    setLastSyncedAt(new Date().toLocaleTimeString());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Spending overview across your expense claims.
            {categoryFilter && (
              <span className="ml-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium">
                Filtered: {categoryFilter}
              </span>
            )}
            {lastSyncedAt && (
              <span className="ml-2 text-xs">Last synced {lastSyncedAt}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => exportClaimsCsv(visibleClaims)}
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <CurrencyRates />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Total spend</div>
          <div className="mt-1 text-2xl font-semibold">{formatMoney(grandTotal)}</div>
        </Card>
        {Object.entries(totals).map(([category, total]) => (
          <Card key={category} className="p-4">
            <div className="text-xs font-medium text-muted-foreground">{category}</div>
            <div className="mt-1 text-2xl font-semibold">{formatMoney(total)}</div>
          </Card>
        ))}
      </div>

      {topClaim && (
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-primary" /> Largest claim
          </div>
          <div className="flex items-start justify-between gap-4">
            <div
              className="text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: topClaim.description }}
            />
            <div className="text-lg font-semibold">{formatMoney(Number(topClaim.amount))}</div>
          </div>
        </Card>
      )}

      <div className="grid gap-3">
        {visibleClaims.map((c) => {
          const receiptUrl = c.receipt_path
            ? supabase.storage.from("public-receipts").getPublicUrl(c.receipt_path).data.publicUrl
            : null;
          return (
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
                  {receiptUrl && (
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-primary underline"
                    >
                      View receipt
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {formatCurrency(Number(c.amount), c.currency)}
                    </div>
                    <div className="mt-1">
                      <ClaimStatusBadge status={c.status} />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Duplicate claim"
                    onClick={() => duplicateClaim(c)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
