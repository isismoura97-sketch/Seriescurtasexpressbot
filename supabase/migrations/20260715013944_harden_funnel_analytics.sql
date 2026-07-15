-- Keep funnel events reliable across client retries and webhook replays.
alter table public.app_events
  add column if not exists event_id text,
  add column if not exists event_source text not null default 'backend',
  add column if not exists sales_channel text not null default 'telegram';

update public.app_events
set event_source = 'client'
where event_name in (
  'app_opened',
  'catalog_loaded',
  'series_viewed',
  'series_search',
  'telegram_open',
  'free_series_opened',
  'favorite_added',
  'add_to_cart',
  'remove_from_cart',
  'checkout_started',
  'cart_abandoned'
);

alter table public.app_events
  drop constraint if exists app_events_event_id_check,
  add constraint app_events_event_id_check check (
    event_id is null or event_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,159}$'
  ),
  drop constraint if exists app_events_event_source_check,
  add constraint app_events_event_source_check check (event_source in ('client', 'backend')),
  drop constraint if exists app_events_sales_channel_check,
  add constraint app_events_sales_channel_check check (sales_channel in ('telegram', 'web'));

-- Webhooks and delivery retries may replay the same terminal transition. Keep
-- the earliest event as the canonical funnel record before enforcing uniqueness.
delete from public.app_events newer
using public.app_events older
where newer.id > older.id
  and newer.order_id = older.order_id
  and newer.event_name = older.event_name
  and newer.order_id is not null
  and newer.event_name in (
    'checkout_created',
    'payment_created',
    'telegram_pre_checkout_approved',
    'payment_approved',
    'purchase_completed',
    'purchase_refunded',
    'purchase_chargeback',
    'delivery_completed'
  );

create unique index if not exists app_events_event_id_uidx
  on public.app_events (event_id)
  where event_id is not null;

create unique index if not exists app_events_terminal_order_event_uidx
  on public.app_events (event_name, order_id)
  where order_id is not null
    and event_name in (
      'checkout_created',
      'payment_created',
      'telegram_pre_checkout_approved',
      'payment_approved',
      'purchase_completed',
      'purchase_refunded',
      'purchase_chargeback',
      'delivery_completed'
    );

create index if not exists app_events_channel_created_at_idx
  on public.app_events (sales_channel, created_at desc);

revoke all on table public.app_events from anon, authenticated;
