-- Cache of FX snapshots pulled from the third-party provider, used for
-- multi-currency conversion across the app.
CREATE TABLE public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base text NOT NULL,
  rates jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.exchange_rates TO authenticated;
GRANT ALL ON public.exchange_rates TO service_role;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_exchange_rates_base ON public.exchange_rates(base, fetched_at DESC);

CREATE POLICY "Anyone signed in can read cached rates"
  ON public.exchange_rates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anyone signed in can cache rates"
  ON public.exchange_rates FOR INSERT TO authenticated
  WITH CHECK (true);
