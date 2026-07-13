import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchRates, type RatesResponse } from "@/lib/exchange-rates";
import { SUPPORTED_CURRENCIES, formatCurrency } from "@/lib/currencies";
import { Card } from "@/components/ui/card";

export function CurrencyRates() {
  const [base, setBase] = useState("USD");
  const [data, setData] = useState<RatesResponse | null>(null);

  // Pull live rates for the selected base currency.
  useEffect(() => {
    fetchRates(base).then(setData);
  }, [base]);

  // Seed from the most recent cached snapshot so the panel isn't empty.
  useEffect(() => {
    supabase
      .from("exchange_rates")
      .select("*")
      .eq("base", base)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .then(({ data: rows }) => {
        const cached = rows?.[0];
        if (cached) {
          setData((prev) => prev ?? { base, rates: cached.rates as Record<string, number> });
        }
      });
  }, [base]);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Exchange rates</h2>
        <select
          value={base}
          onChange={(e) => setBase(e.target.value)}
          className="rounded-md border bg-background px-2 py-1 text-sm"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SUPPORTED_CURRENCIES.filter((c) => c.code !== base).map((c) => (
          <div key={c.code} className="rounded-md bg-muted p-2 text-sm">
            <div className="text-xs text-muted-foreground">{c.code}</div>
            <div className="font-medium">
              {data?.rates?.[c.code] ? formatCurrency(data.rates[c.code], c.code) : "—"}
            </div>
          </div>
        ))}
      </div>

      {data?.provider_html && (
        <div
          className="mt-3 text-xs text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: data.provider_html }}
        />
      )}
      {data?.provider_url && (
        <a
          href={data.provider_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs text-primary underline"
        >
          Rates provided by our FX partner
        </a>
      )}
    </Card>
  );
}
