-- Reduz privilégios residuais da tabela legada de sessões administrativas.
-- A tabela permanece acessível apenas ao backend com service_role.

alter table public.admin_sessions enable row level security;

revoke all on table public.admin_sessions from public, anon, authenticated;
grant all on table public.admin_sessions to service_role;

drop policy if exists "Deny all public access" on public.admin_sessions;
drop policy if exists admin_sessions_deny_public on public.admin_sessions;
create policy admin_sessions_deny_public
  on public.admin_sessions
  for all
  to public
  using (false)
  with check (false);
