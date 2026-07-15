-- Unify payment context without replacing the existing payment_orders contract.
alter table public.payment_orders
  add column if not exists sales_channel text not null default 'telegram',
  add column if not exists payment_provider text not null default 'mercado_pago',
  add column if not exists provider_currency text,
  add column if not exists provider_amount integer,
  add column if not exists external_payment_id text,
  add column if not exists telegram_payment_charge_id text,
  add column if not exists telegram_provider_charge_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists chargeback_at timestamptz;

update public.payment_orders
set
  sales_channel = case when payment_method = 'telegram_checkout' then 'telegram' else coalesce(nullif(checkout_mode, ''), 'telegram') end,
  -- Orders created before this migration used Mercado Pago even when the UI
  -- called the method "telegram_checkout". New Stars orders set the provider
  -- explicitly in the backend.
  payment_provider = case when telegram_payment_charge_id is not null then 'telegram_stars' else 'mercado_pago' end,
  provider_currency = coalesce(provider_currency, case when telegram_payment_charge_id is not null then 'XTR' else currency end),
  paid_at = coalesce(paid_at, confirmed_at),
  external_payment_id = coalesce(external_payment_id, mercado_pago_payment_id)
where sales_channel is null
   or payment_provider is null
   or provider_currency is null
   or (paid_at is null and confirmed_at is not null)
   or (external_payment_id is null and mercado_pago_payment_id is not null);

alter table public.payment_orders
  drop constraint if exists payment_orders_sales_channel_check,
  add constraint payment_orders_sales_channel_check check (sales_channel in ('telegram', 'web')),
  drop constraint if exists payment_orders_provider_check,
  add constraint payment_orders_provider_check check (payment_provider in ('mercado_pago', 'telegram_stars')),
  drop constraint if exists payment_orders_provider_amount_check,
  add constraint payment_orders_provider_amount_check check (provider_amount is null or provider_amount > 0);

create unique index if not exists payment_orders_external_payment_id_uidx
  on public.payment_orders (payment_provider, external_payment_id)
  where external_payment_id is not null;

create unique index if not exists payment_orders_telegram_charge_uidx
  on public.payment_orders (telegram_payment_charge_id)
  where telegram_payment_charge_id is not null;

create index if not exists payment_orders_channel_status_idx
  on public.payment_orders (sales_channel, status, created_at desc);

alter table public.series
  add column if not exists telegram_stars_price integer not null default 50;

alter table public.series
  drop constraint if exists series_telegram_stars_price_check,
  add constraint series_telegram_stars_price_check check (telegram_stars_price > 0);

create table if not exists public.payment_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.payment_orders(order_id) on delete cascade,
  series_id uuid not null references public.series(id) on delete restrict,
  title text not null,
  quantity integer not null default 1,
  unit_amount numeric(12,2) not null,
  discount_amount numeric(12,2) not null default 0,
  final_amount numeric(12,2) not null,
  currency text not null default 'BRL',
  provider_amount integer,
  created_at timestamptz not null default now(),
  constraint payment_order_items_quantity_check check (quantity = 1),
  constraint payment_order_items_amount_check check (
    unit_amount >= 0 and discount_amount >= 0 and final_amount >= 0
    and discount_amount <= unit_amount
  ),
  constraint payment_order_items_currency_check check (currency = 'BRL'),
  constraint payment_order_items_provider_amount_check check (provider_amount is null or provider_amount > 0),
  constraint payment_order_items_order_series_unique unique (order_id, series_id)
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  series_id uuid not null references public.series(id) on delete restrict,
  order_id text references public.payment_orders(order_id) on delete restrict,
  source text not null default 'purchase',
  status text not null default 'active',
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entitlements_source_check check (source in ('purchase', 'free', 'package', 'referral', 'admin')),
  constraint entitlements_status_check check (status in ('active', 'revoked', 'expired')),
  constraint entitlements_user_series_unique unique (user_id, series_id)
);

-- Backfill normalized items for existing orders while preserving the JSON snapshot.
insert into public.payment_order_items (
  order_id,
  series_id,
  title,
  quantity,
  unit_amount,
  discount_amount,
  final_amount,
  currency,
  provider_amount
)
select
  po.order_id,
  (item.value->>'id')::uuid,
  coalesce(nullif(item.value->>'title', ''), s.title, 'Serie'),
  1,
  greatest(0, coalesce(
    case when item.value->>'price' ~ '^[0-9]+([.][0-9]+)?$' then (item.value->>'price')::numeric end,
    s.price,
    0
  )),
  0,
  greatest(0, coalesce(
    case when item.value->>'price' ~ '^[0-9]+([.][0-9]+)?$' then (item.value->>'price')::numeric end,
    s.price,
    0
  )),
  'BRL',
  case when po.payment_provider = 'telegram_stars' then s.telegram_stars_price else null end
from public.payment_orders po
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(po.items) = 'array' then po.items else '[]'::jsonb end
) as item(value)
join public.series s on s.id::text = item.value->>'id'
on conflict (order_id, series_id) do nothing;

-- Existing approved orders become explicit active access grants.
insert into public.entitlements (user_id, series_id, order_id, source, status, granted_at)
select
  po.user_id,
  poi.series_id,
  po.order_id,
  'purchase',
  'active',
  coalesce(po.paid_at, po.confirmed_at, po.updated_at, po.created_at)
from public.payment_orders po
join public.payment_order_items poi on poi.order_id = po.order_id
where po.status = 'approved'
on conflict (user_id, series_id) do update
set
  status = 'active',
  order_id = excluded.order_id,
  revoked_at = null,
  revoke_reason = null,
  updated_at = now();

create index if not exists payment_order_items_series_idx
  on public.payment_order_items (series_id, order_id);

create index if not exists entitlements_order_idx
  on public.entitlements (order_id)
  where order_id is not null;

create index if not exists entitlements_user_status_idx
  on public.entitlements (user_id, status, granted_at desc);

alter table public.payment_order_items enable row level security;
alter table public.entitlements enable row level security;

revoke all on table public.payment_order_items from public, anon, authenticated;
revoke all on table public.entitlements from public, anon, authenticated;
grant all on table public.payment_order_items to service_role;
grant all on table public.entitlements to service_role;
