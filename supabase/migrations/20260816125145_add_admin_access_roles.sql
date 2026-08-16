-- Registro privado de papéis administrativos por Telegram ID.
-- A ativação do RBAC permanece controlada pelo backend e não concede acesso
-- público por padrão.

create table if not exists public.admin_access_roles (
  telegram_user_id text primary key,
  role text not null,
  display_name text,
  enabled boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_access_roles_user_id_check
    check (telegram_user_id ~ '^[0-9]{1,20}$'),
  constraint admin_access_roles_role_check
    check (role in ('owner', 'support', 'operations')),
  constraint admin_access_roles_created_by_check
    check (created_by is null or created_by ~ '^[0-9]{1,20}$')
);

comment on table public.admin_access_roles is
  'Papéis administrativos privados; nunca expor ao cliente ou decidir autorização no frontend.';
comment on column public.admin_access_roles.role is
  'owner, support ou operations; permissões efetivas são decididas pelo backend.';

create index if not exists admin_access_roles_enabled_role_idx
  on public.admin_access_roles (role, enabled)
  where enabled = true;

alter table public.admin_access_roles enable row level security;

revoke all on table public.admin_access_roles from public, anon, authenticated;
grant all on table public.admin_access_roles to service_role;

drop policy if exists admin_access_roles_deny_public on public.admin_access_roles;
create policy admin_access_roles_deny_public
  on public.admin_access_roles
  for all
  to public
  using (false)
  with check (false);
