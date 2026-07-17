create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_codes_user_id_check check (user_id ~ '^[0-9]{1,20}$'),
  constraint referral_codes_code_check check (code ~ '^[A-Z0-9]{8,16}$')
);

-- Reaproveita a tabela legada vazia como fonte de verdade das atribuicoes.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'referrals'
      and column_name = 'new_user_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'referrals'
      and column_name = 'referred_user_id'
  ) then
    alter table public.referrals rename column new_user_id to referred_user_id;
  end if;
end
$$;

alter table public.referrals
  alter column referrer_id type text using referrer_id::text,
  alter column referred_user_id type text using referred_user_id::text,
  alter column status set default 'pending',
  alter column rewarded set default false,
  add column if not exists referral_code_id uuid references public.referral_codes(id) on delete restrict,
  add column if not exists source text not null default 'shared_link',
  add column if not exists first_order_id text references public.payment_orders(order_id) on delete restrict,
  add column if not exists converted_at timestamptz,
  add column if not exists reversed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.referrals
  drop constraint if exists referrals_status_check,
  add constraint referrals_status_check
    check (status in ('pending', 'converted', 'reversed')) not valid,
  drop constraint if exists referrals_source_check,
  add constraint referrals_source_check
    check (source in ('shared_link', 'telegram_deep_link', 'web_link')) not valid,
  drop constraint if exists referrals_distinct_users_check,
  add constraint referrals_distinct_users_check
    check (referrer_id is distinct from referred_user_id) not valid,
  drop constraint if exists referrals_referrer_required_check,
  add constraint referrals_referrer_required_check
    check (referrer_id is not null and referrer_id ~ '^[0-9]{1,20}$') not valid,
  drop constraint if exists referrals_referred_required_check,
  add constraint referrals_referred_required_check
    check (referred_user_id is not null and referred_user_id ~ '^[0-9]{1,20}$') not valid,
  drop constraint if exists referrals_code_required_check,
  add constraint referrals_code_required_check
    check (referral_code_id is not null) not valid;

create index if not exists referral_codes_active_code_idx
  on public.referral_codes (code)
  where active = true;

create index if not exists referrals_referrer_status_idx
  on public.referrals (referrer_id, status, created_at desc);

create index if not exists referrals_order_idx
  on public.referrals (first_order_id)
  where first_order_id is not null;

create or replace function private.sync_referral_from_payment_order()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.referrals
    set
      status = 'converted',
      first_order_id = new.order_id,
      converted_at = coalesce(new.paid_at, new.confirmed_at, now()),
      reversed_at = null,
      updated_at = now()
    where referred_user_id = new.user_id
      and status = 'pending';
  elsif new.status in ('refunded', 'charged_back') then
    update public.referrals
    set
      status = 'reversed',
      reversed_at = now(),
      updated_at = now(),
      rewarded = false
    where first_order_id = new.order_id
      and status = 'converted';
  end if;

  return new;
end;
$$;

revoke all on function private.sync_referral_from_payment_order() from public, anon, authenticated;
grant execute on function private.sync_referral_from_payment_order() to service_role;

drop trigger if exists sync_referral_after_payment_order on public.payment_orders;
create trigger sync_referral_after_payment_order
  after insert or update of status on public.payment_orders
  for each row execute function private.sync_referral_from_payment_order();

alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;

revoke all on table public.referral_codes from public, anon, authenticated;
revoke all on table public.referrals from public, anon, authenticated;
revoke all on table public.referral_earnings from public, anon, authenticated;

grant all on table public.referral_codes to service_role;
grant all on table public.referrals to service_role;
grant all on table public.referral_earnings to service_role;
grant usage, select on sequence public.referrals_id_seq to service_role;

drop policy if exists referral_codes_deny_public on public.referral_codes;
create policy referral_codes_deny_public
  on public.referral_codes
  for all
  to public
  using (false)
  with check (false);
