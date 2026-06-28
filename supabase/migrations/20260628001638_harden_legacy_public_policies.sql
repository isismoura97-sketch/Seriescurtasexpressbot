-- Remove permissive legacy policies from public tables.
-- The current app uses the Edge Function with service-role access, so these tables
-- do not need to be broadly readable/writable from anon/authenticated roles.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'acessos_video' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.acessos_video for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_sessions' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.admin_sessions for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'categories' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.categories for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'combos' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.combos for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coupon_uses' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.coupon_uses for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coupons' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.coupons for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pagamentos_pendentes' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.pagamentos_pendentes for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cart' and policyname = 'Allow all') then
    drop policy "Allow all" on public.cart;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cart' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.cart for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'episodes' and policyname = 'Allow all') then
    drop policy "Allow all" on public.episodes;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'episodes' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.episodes for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'favorites' and policyname = 'Allow all') then
    drop policy "Allow all" on public.favorites;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'favorites' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.favorites for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'Allow all') then
    drop policy "Allow all" on public.orders;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.orders for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'Allow all') then
    drop policy "Allow all" on public.payments;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.payments for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'purchases' and policyname = 'Allow all') then
    drop policy "Allow all" on public.purchases;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'purchases' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.purchases for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ratings' and policyname = 'Allow all') then
    drop policy "Allow all" on public.ratings;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ratings' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.ratings for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'referral_earnings' and policyname = 'Allow all') then
    drop policy "Allow all" on public.referral_earnings;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'referral_earnings' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.referral_earnings for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'referrals' and policyname = 'Allow all') then
    drop policy "Allow all" on public.referrals;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'referrals' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.referrals for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reports' and policyname = 'Allow all') then
    drop policy "Allow all" on public.reports;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reports' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.reports for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'series' and policyname = 'Allow all') then
    drop policy "Allow all" on public.series;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'series' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.series for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_flows' and policyname = 'Allow all') then
    drop policy "Allow all" on public.user_flows;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_flows' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.user_flows for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'Allow all') then
    drop policy "Allow all" on public.users;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.users for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'watch_history' and policyname = 'Allow all') then
    drop policy "Allow all" on public.watch_history;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'watch_history' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.watch_history for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'vendas' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.vendas for all to public using (false) with check (false);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'withdrawals' and policyname = 'Allow all') then
    drop policy "Allow all" on public.withdrawals;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'withdrawals' and policyname = 'Deny all public access') is false then
    create policy "Deny all public access" on public.withdrawals for all to public using (false) with check (false);
  end if;
end $$;
