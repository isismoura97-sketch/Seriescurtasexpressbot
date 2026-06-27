create table if not exists public.payment_orders (
  order_id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id text not null,
  chat_id text not null,
  status text not null default 'created',
  payment_method text not null,
  checkout_mode text not null default 'telegram',
  currency text not null default 'BRL',
  amount numeric(12,2) not null default 0,
  items jsonb not null default '[]'::jsonb,
  buyer_email text,
  buyer_name text,
  description text,
  external_reference text not null,
  preference_id text,
  mercado_pago_payment_id text,
  checkout_url text,
  pix_qr_code text,
  pix_qr_code_base64 text,
  ticket_url text,
  qr_code_expires_at timestamptz,
  webhook_payload jsonb not null default '{}'::jsonb,
  last_event_at timestamptz,
  confirmed_at timestamptz,
  canceled_at timestamptz,
  rejected_at timestamptz,
  error_message text
);

alter table public.payment_orders enable row level security;

create unique index if not exists payment_orders_external_reference_uidx
  on public.payment_orders (external_reference);

create unique index if not exists payment_orders_mercado_pago_payment_id_uidx
  on public.payment_orders (mercado_pago_payment_id);

create index if not exists payment_orders_created_at_idx
  on public.payment_orders (created_at desc);

create index if not exists payment_orders_user_id_idx
  on public.payment_orders (user_id, created_at desc);

create index if not exists payment_orders_status_idx
  on public.payment_orders (status, created_at desc);

create index if not exists payment_orders_payment_method_idx
  on public.payment_orders (payment_method, created_at desc);
