create schema if not exists private;

create table if not exists public.customer_accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  status text not null default 'active',
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_accounts_full_name_check check (
    char_length(btrim(full_name)) between 2 and 120
  ),
  constraint customer_accounts_email_check check (
    email = lower(btrim(email)) and char_length(email) between 3 and 320
  ),
  constraint customer_accounts_status_check check (
    status in ('active', 'blocked', 'deletion_requested')
  )
);

create unique index if not exists customer_accounts_email_uidx
  on public.customer_accounts (lower(email));

create table if not exists public.customer_account_consents (
  id bigint generated always as identity primary key,
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  document_type text not null,
  document_version text not null,
  action text not null default 'accepted',
  source text not null default 'web_registration',
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint customer_account_consents_document_check check (
    document_type in ('terms', 'privacy', 'marketing')
  ),
  constraint customer_account_consents_action_check check (
    action in ('accepted', 'revoked')
  ),
  constraint customer_account_consents_source_check check (
    source in ('web_registration', 'account_settings', 'admin')
  )
);

create index if not exists customer_account_consents_account_idx
  on public.customer_account_consents (account_id, accepted_at desc);

create table if not exists public.customer_telegram_links (
  account_id uuid primary key references public.customer_accounts(id) on delete cascade,
  telegram_user_id text not null unique,
  telegram_username text,
  telegram_first_name text,
  telegram_last_name text,
  linked_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  constraint customer_telegram_links_user_id_check check (
    telegram_user_id ~ '^[0-9]{1,20}$'
  )
);

create index if not exists customer_telegram_links_verified_idx
  on public.customer_telegram_links (last_verified_at desc);

create or replace function private.sync_customer_account_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text;
  normalized_email text;
  terms_version text;
  privacy_version text;
begin
  normalized_name := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  normalized_email := lower(btrim(coalesce(new.email, '')));

  if normalized_email = '' then
    return new;
  end if;

  if char_length(normalized_name) < 2 then
    normalized_name := split_part(normalized_email, '@', 1);
  end if;

  if char_length(normalized_name) < 2 then
    normalized_name := 'Cliente';
  end if;

  insert into public.customer_accounts (
    id,
    full_name,
    email,
    email_verified_at,
    updated_at
  ) values (
    new.id,
    left(normalized_name, 120),
    normalized_email,
    new.email_confirmed_at,
    now()
  )
  on conflict (id) do update
  set
    full_name = case
      when excluded.full_name <> 'Cliente' then excluded.full_name
      else public.customer_accounts.full_name
    end,
    email = excluded.email,
    email_verified_at = excluded.email_verified_at,
    updated_at = now();

  if tg_op = 'INSERT' then
    terms_version := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'terms_version', '')), '');
    privacy_version := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'privacy_version', '')), '');

    if coalesce((new.raw_user_meta_data ->> 'terms_accepted')::boolean, false) and terms_version is not null then
      insert into public.customer_account_consents (
        account_id,
        document_type,
        document_version,
        metadata
      ) values (
        new.id,
        'terms',
        left(terms_version, 40),
        jsonb_build_object('registration_source', 'series_app')
      );
    end if;

    if coalesce((new.raw_user_meta_data ->> 'privacy_accepted')::boolean, false) and privacy_version is not null then
      insert into public.customer_account_consents (
        account_id,
        document_type,
        document_version,
        metadata
      ) values (
        new.id,
        'privacy',
        left(privacy_version, 40),
        jsonb_build_object('registration_source', 'series_app')
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_customer_account_from_auth() from public, anon, authenticated;

drop trigger if exists on_auth_user_sync_customer_account on auth.users;
create trigger on_auth_user_sync_customer_account
  after insert or update of email, email_confirmed_at, raw_user_meta_data
  on auth.users
  for each row execute function private.sync_customer_account_from_auth();

insert into public.customer_accounts (id, full_name, email, email_verified_at)
select
  users.id,
  left(coalesce(
    nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(lower(btrim(users.email)), '@', 1), ''),
    'Cliente'
  ), 120),
  lower(btrim(users.email)),
  users.email_confirmed_at
from auth.users as users
where users.email is not null
on conflict (id) do update
set
  email = excluded.email,
  email_verified_at = excluded.email_verified_at,
  updated_at = now();

alter table public.customer_accounts enable row level security;
alter table public.customer_account_consents enable row level security;
alter table public.customer_telegram_links enable row level security;

revoke all on table public.customer_accounts from public, anon, authenticated;
revoke all on table public.customer_account_consents from public, anon, authenticated;
revoke all on table public.customer_telegram_links from public, anon, authenticated;
revoke all on sequence public.customer_account_consents_id_seq from public, anon, authenticated;

grant select on table public.customer_accounts to authenticated;
grant select on table public.customer_account_consents to authenticated;
grant select on table public.customer_telegram_links to authenticated;
grant all on table public.customer_accounts to service_role;
grant all on table public.customer_account_consents to service_role;
grant all on table public.customer_telegram_links to service_role;
grant all on sequence public.customer_account_consents_id_seq to service_role;

drop policy if exists customer_accounts_select_own on public.customer_accounts;
create policy customer_accounts_select_own
  on public.customer_accounts
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists customer_account_consents_select_own on public.customer_account_consents;
create policy customer_account_consents_select_own
  on public.customer_account_consents
  for select
  to authenticated
  using ((select auth.uid()) = account_id);

drop policy if exists customer_telegram_links_select_own on public.customer_telegram_links;
create policy customer_telegram_links_select_own
  on public.customer_telegram_links
  for select
  to authenticated
  using ((select auth.uid()) = account_id);
