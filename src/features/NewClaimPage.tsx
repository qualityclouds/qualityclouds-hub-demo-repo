import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from "@/lib/currencies";
import { toast } from "sonner";
import { z } from "zod";
import { Upload } from "lucide-react";

const CURRENCY_CODES = SUPPORTED_CURRENCIES.map((c) => c.code) as [string, ...string[]];

const schema = z.object({
  amount: z.number().positive("Amount must be positive").max(1000000),
  category: z.enum(CATEGORIES),
  currency: z.enum(CURRENCY_CODES),
  expense_date: z.string().min(1),
  description: z.string().trim().min(3, "Add a short description").max(500),
});

export function NewClaimPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [category, setCategory] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({
      amount: Number(amount),
      category,
      currency,
      expense_date: date,
      description,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      let receipt_path: string | null = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Receipt must be under 5MB");
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("receipts")
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        receipt_path = path;
      }
      const { error } = await supabase.from("expense_claims").insert({
        user_id: user.id,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        category: parsed.data.category,
        expense_date: parsed.data.expense_date,
        description: parsed.data.description,
        receipt_path,
      });
      if (error) throw error;
      toast.success("Claim submitted");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New expense claim</h1>
        <p className="text-sm text-muted-foreground">
          Attach a photo of the receipt so finance can process it.
        </p>
      </div>
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for?"
              rows={3}
              maxLength={500}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="receipt">Receipt photo</Label>
            <label
              htmlFor="receipt"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition hover:bg-accent/40"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div className="text-sm">
                {file ? (
                  <span className="font-medium">{file.name}</span>
                ) : (
                  <>
                    <span className="font-medium text-primary">Click to upload</span>
                    <span className="text-muted-foreground"> — PNG, JPG up to 5MB</span>
                  </>
                )}
              </div>
              <input
                id="receipt"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate({ to: "/" })}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy}
              style={{ background: "var(--gradient-brand)" }}
            >
              {busy ? "Submitting…" : "Submit claim"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
