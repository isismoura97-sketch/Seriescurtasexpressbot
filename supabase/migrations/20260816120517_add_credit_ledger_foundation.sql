-- Fundação do ledger de créditos da ShortNovels.
--
-- Esta migração não ativa recompensas nem cria lançamentos. Ela apenas cria
-- um histórico privado, append-only e idempotente para suportar uma regra
-- comercial futura sem depender de um campo mutável de saldo.

create table if not exists public.credit_ledger_entries (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id text not null,
  direction text not null,
  amount_cents bigint not null,
  currency text not null default 'BRL',
  entry_type text not null,
  referral_id bigint references public.referrals(id) on delete restrict,
  order_id text references public.payment_orders(order_id) on delete restrict,
  reversal_of uuid references public.credit_ledger_entries(id) on delete restrict,
  source_event_id text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint credit_ledger_user_id_check
    check (user_id ~ '^[0-9]{1,20}$'),
  constraint credit_ledger_direction_check
    check (direction in ('credit', 'debit')),
  constraint credit_ledger_amount_check
    check (amount_cents > 0),
  constraint credit_ledger_currency_check
    check (currency = 'BRL'),
  constraint credit_ledger_entry_type_check
    check (entry_type in (
      'referral_reward',
      'referral_reversal',
      'expiry',
      'manual_adjustment'
    )),
  constraint credit_ledger_entry_direction_check
    check (
      (entry_type = 'referral_reward' and direction = 'credit')
      or (entry_type = 'referral_reversal' and direction = 'debit')
      or entry_type in ('expiry', 'manual_adjustment')
    ),
  constraint credit_ledger_reversal_link_check
    check (
      (entry_type = 'referral_reversal' and reversal_of is not null)
      or (entry_type <> 'referral_reversal' and reversal_of is null)
    )
);

comment on table public.credit_ledger_entries is
  'Ledger privado e append-only de créditos e débitos; recompensas permanecem desativadas até regra comercial aprovada.';
comment on column public.credit_ledger_entries.source_event_id is
  'Chave idempotente do evento que originou o lançamento.';
comment on column public.credit_ledger_entries.metadata is
  'Metadados operacionais mínimos; não armazenar secrets, tokens ou dados de pagamento sensíveis.';

create index if not exists credit_ledger_user_effective_idx
  on public.credit_ledger_entries (user_id, effective_at desc);

create index if not exists credit_ledger_referral_idx
  on public.credit_ledger_entries (referral_id, effective_at desc)
  where referral_id is not null;

create index if not exists credit_ledger_order_idx
  on public.credit_ledger_entries (order_id, effective_at desc)
  where order_id is not null;

create unique index if not exists credit_ledger_one_reversal_idx
  on public.credit_ledger_entries (reversal_of)
  where reversal_of is not null;

create or replace function private.prevent_credit_ledger_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'credit ledger entries are append-only';
end;
$$;

revoke all on function private.prevent_credit_ledger_mutation() from public, anon, authenticated;
grant execute on function private.prevent_credit_ledger_mutation() to service_role;

drop trigger if exists prevent_credit_ledger_update on public.credit_ledger_entries;
create trigger prevent_credit_ledger_update
  before update or delete on public.credit_ledger_entries
  for each row execute function private.prevent_credit_ledger_mutation();

alter table public.credit_ledger_entries enable row level security;

revoke all on table public.credit_ledger_entries from public, anon, authenticated;
grant all on table public.credit_ledger_entries to service_role;

drop policy if exists credit_ledger_deny_public on public.credit_ledger_entries;
create policy credit_ledger_deny_public
  on public.credit_ledger_entries
  for all
  to public
  using (false)
  with check (false);
