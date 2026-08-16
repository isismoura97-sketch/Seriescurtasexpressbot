-- Trilha privada das transicoes de status dos tickets de suporte.

create table if not exists public.support_ticket_status_events (
  id uuid primary key default extensions.uuid_generate_v4(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  previous_status text not null,
  new_status text not null,
  changed_by_telegram_id text not null,
  changed_by_role text not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint support_ticket_status_events_actor_check
    check (changed_by_telegram_id ~ '^[0-9]{1,20}$'),
  constraint support_ticket_status_events_previous_status_check
    check (previous_status in ('new', 'in_progress', 'resolved', 'closed')),
  constraint support_ticket_status_events_new_status_check
    check (new_status in ('new', 'in_progress', 'resolved', 'closed')),
  constraint support_ticket_status_events_role_check
    check (changed_by_role in ('owner', 'support'))
);

comment on table public.support_ticket_status_events is
  'Trilha privada e append-only das alteracoes de status dos tickets de suporte.';

create index if not exists support_ticket_status_events_ticket_idx
  on public.support_ticket_status_events (ticket_id, created_at desc);
create index if not exists support_ticket_status_events_actor_idx
  on public.support_ticket_status_events (changed_by_telegram_id, created_at desc);

alter table public.support_ticket_status_events enable row level security;

revoke all on table public.support_ticket_status_events from public, anon, authenticated;
grant all on table public.support_ticket_status_events to service_role;

drop policy if exists support_ticket_status_events_deny_public on public.support_ticket_status_events;
create policy support_ticket_status_events_deny_public
  on public.support_ticket_status_events
  for all
  to public
  using (false)
  with check (false);

create or replace function private.prevent_support_ticket_status_event_update()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'support ticket status events are append-only';
end;
$$;

revoke all on function private.prevent_support_ticket_status_event_update() from public, anon, authenticated;

drop trigger if exists support_ticket_status_events_append_only on public.support_ticket_status_events;
create trigger support_ticket_status_events_append_only
before update or delete on public.support_ticket_status_events
for each row execute function private.prevent_support_ticket_status_event_update();
