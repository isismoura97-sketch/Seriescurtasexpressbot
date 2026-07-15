create or replace function public.claim_checkout_recovery_candidates(
  p_limit integer default 25,
  p_delay_minutes integer default 60,
  p_max_age_hours integer default 24,
  p_user_cooldown_hours integer default 168
)
returns table (
  order_id text,
  user_id text,
  chat_id text,
  payment_method text,
  amount numeric,
  items jsonb,
  checkout_url text,
  ticket_url text,
  created_at timestamptz,
  checkout_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_delay interval := make_interval(mins => least(greatest(coalesce(p_delay_minutes, 60), 15), 10080));
  v_max_age interval := make_interval(hours => least(greatest(coalesce(p_max_age_hours, 24), 1), 720));
  v_user_cooldown interval := make_interval(hours => least(greatest(coalesce(p_user_cooldown_hours, 168), 1), 2160));
begin
  perform pg_advisory_xact_lock(hashtext('checkout-recovery-claim-v1'));

  return query
  with eligible as (
    select
      po.order_id,
      po.user_id,
      po.chat_id,
      po.payment_method,
      po.amount,
      po.items,
      po.checkout_url,
      po.ticket_url,
      po.created_at,
      coalesce(po.checkout_expires_at, po.qr_code_expires_at, po.created_at + v_max_age) as effective_expires_at,
      row_number() over (partition by po.user_id order by po.created_at desc) as user_rank
    from public.payment_orders po
    join public.user_notification_preferences pref
      on pref.user_id = po.user_id
    where po.status in ('created', 'pending', 'pending_payment', 'in_process', 'pending_review')
      and po.confirmed_at is null
      and po.paid_at is null
      and po.canceled_at is null
      and po.rejected_at is null
      and po.recovery_sent_at is null
      and coalesce(po.recovery_eligible_at, po.updated_at + v_delay) <= now()
      and coalesce(po.checkout_last_seen_at, po.last_event_at, po.updated_at, po.created_at) <= now() - v_delay
      and coalesce(po.checkout_expires_at, po.qr_code_expires_at, po.created_at + v_max_age) > now()
      and po.created_at >= now() - v_max_age
      and jsonb_typeof(po.items) = 'array'
      and jsonb_array_length(po.items) > 0
      and pref.bot_started_at is not null
      and pref.checkout_abandoned_enabled = true
      and pref.recovery_consented_at is not null
      and pref.notification_channel = 'telegram'
      and not exists (
        select 1
        from public.checkout_recoveries existing
        where existing.order_id = po.order_id
      )
      and not exists (
        select 1
        from public.checkout_recoveries recent
        where recent.user_id = po.user_id
          and recent.sent_at > now() - v_user_cooldown
      )
      and not exists (
        select 1
        from jsonb_array_elements(po.items) item(value)
        join public.entitlements entitlement
          on entitlement.series_id::text = coalesce(
            item.value->>'id',
            item.value->>'series_id',
            item.value->>'serie_id'
          )
        where entitlement.user_id = po.user_id
          and entitlement.status = 'active'
      )
  ), claimed as (
    insert into public.checkout_recoveries (order_id, user_id, status, detected_at)
    select eligible.order_id, eligible.user_id, 'queued', now()
    from eligible
    where eligible.user_rank = 1
    order by eligible.created_at
    limit v_limit
    on conflict on constraint checkout_recoveries_pkey do nothing
    returning checkout_recoveries.order_id as claimed_order_id
  )
  select
    eligible.order_id,
    eligible.user_id,
    eligible.chat_id,
    eligible.payment_method,
    eligible.amount,
    eligible.items,
    eligible.checkout_url,
    eligible.ticket_url,
    eligible.created_at,
    eligible.effective_expires_at
  from eligible
  join claimed on claimed.claimed_order_id = eligible.order_id
  order by eligible.created_at;
end;
$$;

revoke all on function public.claim_checkout_recovery_candidates(integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_checkout_recovery_candidates(integer, integer, integer, integer)
  to service_role;
