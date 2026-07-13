import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClaimStatusBadge } from "@/components/ClaimStatusBadge";
import { formatMoney, CATEGORIES } from "@/lib/categories";
import { logAudit } from "@/lib/audit-log";
import { notifyDecision } from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import { toast } from "sonner";
import { Download, TrendingUp, Users, DollarSign, Image as ImageIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Claim = {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  expense_date: string;
  description: string;
  receipt_path: string | null;
  status: "pending" | "approved" | "rejected";
  manager_comment: string | null;
  created_at: string;
};

type Profile = { id: string; email: string; full_name: string | null };

export function ManagerPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("dashboard");

  const { data: claims } = useQuery({
    queryKey: ["all-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_claims")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Claim[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, email, full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles?.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  const stats = useMemo(() => {
    if (!claims) return null;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const approvedThisMonth = claims.filter(
      (c) => c.status === "approved" && new Date(c.expense_date) >= monthStart,
    );
    const totalMonth = approvedThisMonth.reduce((s, c) => s + Number(c.amount), 0);

    const byCat: Record<string, number> = {};
    CATEGORIES.forEach((c) => (byCat[c] = 0));
    approvedThisMonth.forEach((c) => {
      byCat[c.category] = (byCat[c.category] ?? 0) + Number(c.amount);
    });
    const categoryData = Object.entries(byCat).map(([category, total]) => ({
      category,
      total: Math.round(total * 100) / 100,
    }));

    const bySpender: Record<string, number> = {};
    claims
      .filter((c) => c.status === "approved")
      .forEach((c) => {
        bySpender[c.user_id] = (bySpender[c.user_id] ?? 0) + Number(c.amount);
      });
    const topSpenders = Object.entries(bySpender)
      .map(([uid, total]) => ({
        uid,
        total,
        name:
          profileMap.get(uid)?.full_name ||
          profileMap.get(uid)?.email ||
          "Unknown",
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const pending = claims.filter((c) => c.status === "pending").length;
    return { totalMonth, categoryData, topSpenders, pending };
  }, [claims, profileMap]);

  const decide = async (
    claim: Claim,
    status: "approved" | "rejected",
    comment: string,
  ) => {
    const { error } = await supabase
      .from("expense_claims")
      .update({
        status,
        manager_comment: comment || null,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", claim.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const email = profileMap.get(claim.user_id)?.email ?? "";
    logAudit(status, { claimId: claim.id, amount: claim.amount, reviewer: user?.id });
    notifyDecision(email, status, Number(claim.amount));
    toast.success(`Claim ${status}`);
    qc.invalidateQueries({ queryKey: ["all-claims"] });
  };

  const exportCsv = () => {
    if (!claims) return;
    trackEvent("claims_exported", { count: claims.length });
    logAudit("exported", { count: claims.length, by: user?.id });
    const rows = [
      [
        "id",
        "employee_name",
        "employee_email",
        "amount_usd",
        "category",
        "expense_date",
        "description",
        "status",
        "manager_comment",
        "submitted_at",
      ],
      ...claims.map((c) => {
        const p = profileMap.get(c.user_id);
        return [
          c.id,
          p?.full_name ?? "",
          p?.email ?? "",
          c.amount,
          c.category,
          c.expense_date,
          c.description,
          c.status,
          c.manager_comment ?? "",
          c.created_at,
        ];
      }),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-claims-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manager view</h1>
          <p className="text-sm text-muted-foreground">Approve claims and track team spending.</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="claims">
            All claims {stats?.pending ? `(${stats.pending} pending)` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Approved this month"
              value={stats ? formatMoney(stats.totalMonth) : "—"}
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Pending review"
              value={stats?.pending?.toString() ?? "—"}
            />
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="Active spenders"
              value={stats?.topSpenders.length.toString() ?? "—"}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="p-6 lg:col-span-3">
              <h3 className="mb-4 font-semibold">Spend by category — this month</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.categoryData ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="category"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                      formatter={(v: number) => formatMoney(v)}
                    />
                    <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-6 lg:col-span-2">
              <h3 className="mb-4 font-semibold">Top 5 spenders</h3>
              {stats && stats.topSpenders.length > 0 ? (
                <ol className="space-y-3">
                  {stats.topSpenders.map((s, i) => (
                    <li key={s.uid} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground"
                          style={{ background: "var(--gradient-brand)" }}
                        >
                          {i + 1}
                        </span>
                        <span className="truncate text-sm">{s.name}</span>
                      </div>
                      <span className="text-sm font-semibold">{formatMoney(s.total)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No approved claims yet.</p>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="claims" className="mt-6">
          {!claims || claims.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No claims submitted yet.
            </Card>
          ) : (
            <div className="grid gap-3">
              {claims.map((c) => (
                <ClaimRow
                  key={c.id}
                  claim={c}
                  profile={profileMap.get(c.user_id)}
                  onDecide={decide}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg text-primary-foreground"
          style={{ background: "var(--gradient-brand)" }}
        >
          {icon}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
        </div>
      </div>
    </Card>
  );
}

function ClaimRow({
  claim,
  profile,
  onDecide,
}: {
  claim: Claim;
  profile?: Profile;
  onDecide: (c: Claim, s: "approved" | "rejected", comment: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState(claim.manager_comment ?? "");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const openReceipt = async () => {
    if (!claim.receipt_path) return;
    const { data } = await supabase.storage
      .from("receipts")
      .createSignedUrl(claim.receipt_path, 300);
    if (data?.signedUrl) setReceiptUrl(data.signedUrl);
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">
              {profile?.full_name || profile?.email || "Unknown"}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{claim.category}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {format(new Date(claim.expense_date), "MMM d, yyyy")}
            </span>
          </div>
          <p className="text-sm">{claim.description}</p>
          {claim.manager_comment && (
            <p className="mt-2 rounded-md bg-muted p-2 text-xs">
              <span className="font-medium">Comment: </span>
              {claim.manager_comment}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-lg font-semibold">{formatMoney(Number(claim.amount))}</div>
          <ClaimStatusBadge status={claim.status} />
          <div className="flex gap-2">
            {claim.receipt_path && (
              <Dialog
                onOpenChange={(o) => {
                  if (o) openReceipt();
                  else setReceiptUrl(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <ImageIcon className="mr-1 h-4 w-4" /> Receipt
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Receipt</DialogTitle>
                  </DialogHeader>
                  {receiptUrl ? (
                    <img
                      src={receiptUrl}
                      alt="Receipt"
                      className="max-h-[70vh] w-full rounded-md object-contain"
                    />
                  ) : (
                    <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
                  )}
                </DialogContent>
              </Dialog>
            )}
            {claim.status === "pending" && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" style={{ background: "var(--gradient-brand)" }}>
                    Review
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Review claim</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="rounded-md bg-muted p-3 text-sm">
                      <div className="font-medium">
                        {formatMoney(Number(claim.amount))} · {claim.category}
                      </div>
                      <div className="text-muted-foreground">{claim.description}</div>
                    </div>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Optional comment for the employee"
                      rows={3}
                      maxLength={500}
                    />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await onDecide(claim, "rejected", comment);
                        setOpen(false);
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      style={{ background: "var(--gradient-brand)" }}
                      onClick={async () => {
                        await onDecide(claim, "approved", comment);
                        setOpen(false);
                      }}
                    >
                      Approve
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
