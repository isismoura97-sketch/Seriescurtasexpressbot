-- Tickets privados para acompanhamento operacional do suporte.

create table if not exists public.support_tickets (
  id uuid primary key default extensions.uuid_generate_v4(),
  requester_telegram_id text not null,
  requester_email text not null,
  subject text not null,
  description text not null,
  context text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint support_tickets_requester_check
    check (requester_telegram_id ~ '^[0-9]{1,20}$'),
  constraint support_tickets_subject_check
    check (char_length(subject) between 3 and 160),
  constraint support_tickets_description_check
    check (char_length(description) between 20 and 12000),
  constraint support_tickets_status_check
    check (status in ('new', 'in_progress', 'resolved', 'closed'))
);

comment on table public.support_tickets is
  'Tickets privados de suporte; conteúdo acessível somente ao backend e aos papéis administrativos autorizados.';

create index if not exists support_tickets_status_created_idx
  on public.support_tickets (status, created_at desc);
create index if not exists support_tickets_requester_created_idx
  on public.support_tickets (requester_telegram_id, created_at desc);

alter table public.support_tickets enable row level security;

revoke all on table public.support_tickets from public, anon, authenticated;
grant all on table public.support_tickets to service_role;

drop policy if exists support_tickets_deny_public on public.support_tickets;
create policy support_tickets_deny_public
  on public.support_tickets
  for all
  to public
  using (false)
  with check (false);
