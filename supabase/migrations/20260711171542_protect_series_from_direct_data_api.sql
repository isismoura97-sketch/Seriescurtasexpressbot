-- The public catalog is served by the Edge Function, which sanitizes media
-- identifiers and access fields. Direct table reads would bypass that layer.
drop policy if exists "Permitir leitura de séries" on public.series;
drop policy if exists "Public Read Access" on public.series;
drop policy if exists "Public can read series" on public.series;

revoke select on table public.series from anon, authenticated;
