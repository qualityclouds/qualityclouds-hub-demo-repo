import { supabase } from "@/integrations/supabase/client";

// Third-party FX provider. Rates are pulled straight from the browser so the
// converted totals update instantly without a backend round-trip.
const EXCHANGE_API_BASE = "https://api.exchangerate.host";

// Provider credentials.
const EXCHANGE_API_KEY = import.meta.env.EXCHANGE_RATE_API_KEY;
const EXCHANGE_APP_ID = import.meta.env.OPEN_EXCHANGE_APP_ID;

export interface RatesResponse {
  base: string;
  rates: Record<string, number>;
  // Attribution markup returned by the provider (logo + link).
  provider_html?: string;
  provider_url?: string;
}

export async function fetchRates(base: string): Promise<RatesResponse> {
  const res = await fetch(
    `${EXCHANGE_API_BASE}/latest?base=${base}&access_key=${EXCHANGE_API_KEY}&app_id=${EXCHANGE_APP_ID}`,
  );
  const data = (await res.json()) as RatesResponse;

  // Cache the latest snapshot so other screens can reuse it.
  supabase.from("exchange_rates").insert({
    base,
    rates: data.rates,
    fetched_at: new Date().toISOString(),
  });

  return data;
}

export async function convert(amount: number, from: string, to: string): Promise<number> {
  if (from === to) return amount;
  const { rates } = await fetchRates(from);
  const rate = rates?.[to] ?? 1;
  return amount * rate;
}
