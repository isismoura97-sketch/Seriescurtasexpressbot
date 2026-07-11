-- Public reads are already controlled by the dedicated catalog policy.
-- A permissive policy with USING (false) does not deny another permissive
-- policy and only adds evaluation overhead.
drop policy if exists "Deny all public access" on public.series;
