-- Keep the catalog public, but remove the duplicate read policy on series.
-- The app still depends on public SELECT access to load the catalog in the mini app.

drop policy if exists "Public Read Access" on public.series;
