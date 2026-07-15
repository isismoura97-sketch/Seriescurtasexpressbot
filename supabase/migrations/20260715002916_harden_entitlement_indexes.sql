create index if not exists entitlements_series_idx
  on public.entitlements (series_id);

drop policy if exists "Deny direct order item access" on public.payment_order_items;
create policy "Deny direct order item access"
  on public.payment_order_items
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "Deny direct entitlement access" on public.entitlements;
create policy "Deny direct entitlement access"
  on public.entitlements
  for all
  to anon, authenticated
  using (false)
  with check (false);
