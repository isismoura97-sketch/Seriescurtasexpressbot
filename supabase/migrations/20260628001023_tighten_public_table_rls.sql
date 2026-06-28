-- Tighten public tables that are only meant to be accessed by Edge Functions / service role.
-- These policies intentionally deny anon/authenticated access while keeping service_role access
-- available through RLS bypass.

alter table public.sales enable row level security;
alter table public.series_requests enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sales'
      and policyname = 'Deny all public access'
  ) then
    create policy "Deny all public access"
      on public.sales
      for all
      to public
      using (false)
      with check (false);
  end if;
end $$;

drop policy if exists "Public Read Images" on storage.objects;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'series_requests'
      and policyname = 'Deny all public access'
  ) then
    create policy "Deny all public access"
      on public.series_requests
      for all
      to public
      using (false)
      with check (false);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_orders'
      and policyname = 'Deny all public access'
  ) then
    create policy "Deny all public access"
      on public.payment_orders
      for all
      to public
      using (false)
      with check (false);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_channel_member_audit'
      and policyname = 'Deny all public access'
  ) then
    create policy "Deny all public access"
      on public.public_channel_member_audit
      for all
      to public
      using (false)
      with check (false);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_channel_post_audit'
      and policyname = 'Deny all public access'
  ) then
    create policy "Deny all public access"
      on public.public_channel_post_audit
      for all
      to public
      using (false)
      with check (false);
  end if;
end $$;
