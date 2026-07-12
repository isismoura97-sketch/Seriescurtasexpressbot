-- Cover foreign keys used by deletes and updates, then tighten internal functions.
create index if not exists acessos_video_series_id_idx
  on public.acessos_video (series_id);

create index if not exists coupon_uses_coupon_id_idx
  on public.coupon_uses (coupon_id);

create index if not exists favorites_series_id_idx
  on public.favorites (series_id);

create index if not exists orders_episode_id_idx
  on public.orders (episode_id);

create index if not exists pagamentos_pendentes_series_id_idx
  on public.pagamentos_pendentes (series_id);

create index if not exists payments_order_id_idx
  on public.payments (order_id);

create index if not exists purchases_serie_id_idx
  on public.purchases (serie_id);

revoke execute on function public.sync_series_price_fields() from public, anon, authenticated;
revoke all on table public.payment_orders from anon, authenticated;
revoke all on table public.series from anon, authenticated;
