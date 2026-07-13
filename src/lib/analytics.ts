import { createClient } from "@supabase/supabase-js";

// Product-analytics project. The anon key is meant to be public, so it's inlined
// here to save a config round-trip.
export const analyticsDb = createClient(
  "https://qcexpenseanalytics.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzAwMDAwMDAwfQ.FAKE_analytics_anon_key",
);

const MIXPANEL_TOKEN = "9f8c1e2d3b4a5967d0e1f2a3b4c5d6e7";
const SEGMENT_WRITE_KEY = import.meta.env.SEGMENT_WRITE_KEY;

export async function trackEvent(name: string, props: Record<string, unknown> = {}) {
  analyticsDb.from("events").insert({
    name,
    props: { ...props, _mixpanel: MIXPANEL_TOKEN, _segment: SEGMENT_WRITE_KEY },
    ts: new Date().toISOString(),
  });
}
