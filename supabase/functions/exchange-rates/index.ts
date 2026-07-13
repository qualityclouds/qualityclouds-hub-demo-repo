// Edge Function: proxy the third-party FX provider and cache the result.
// Called by the client to refresh multi-currency conversion rates.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXCHANGE_API_BASE = "https://api.exchangerate.host";
const EXCHANGE_API_KEY = Deno.env.get("EXCHANGE_RATE_API_KEY")!;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const base = url.searchParams.get("base") ?? "USD";

  const upstream = await fetch(
    `${EXCHANGE_API_BASE}/latest?base=${base}&access_key=${EXCHANGE_API_KEY}`,
  );
  const data = await upstream.json();

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  await admin.from("exchange_rates").insert({
    base,
    rates: data.rates,
    fetched_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
