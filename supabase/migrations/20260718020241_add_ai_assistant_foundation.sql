create schema if not exists private;

create table if not exists public.ai_settings (
  singleton boolean primary key default true check (singleton),
  ai_enabled boolean not null default false,
  ai_editorial_enabled boolean not null default false,
  ai_search_enabled boolean not null default false,
  ai_support_enabled boolean not null default false,
  ai_streaming_enabled boolean not null default false,
  provider text not null default 'openai' check (provider in ('openai')),
  model text not null default 'gpt-5.6-luna' check (char_length(model) between 2 and 100),
  assistant_name text not null default 'Express IA' check (char_length(assistant_name) between 2 and 60),
  welcome_message text not null default 'Olá! Sou a Express IA. Posso ajudar você a encontrar uma série curta de acordo com o que deseja assistir.' check (char_length(welcome_message) between 10 and 240),
  tone text not null default 'acolhedor, objetivo e fácil de entender' check (char_length(tone) between 3 and 120),
  description text not null default 'Assistente de inteligência artificial do Séries Curtas Express.' check (char_length(description) between 10 and 240),
  avatar_url text,
  daily_request_limit_per_user integer not null default 10 check (daily_request_limit_per_user between 1 and 1000),
  daily_request_limit_per_admin integer not null default 100 check (daily_request_limit_per_admin between 1 and 5000),
  monthly_budget_cents integer check (monthly_budget_cents is null or monthly_budget_cents >= 0),
  max_input_characters integer not null default 8000 check (max_input_characters between 500 and 50000),
  max_output_tokens integer not null default 1200 check (max_output_tokens between 100 and 8000),
  request_timeout_ms integer not null default 25000 check (request_timeout_ms between 3000 and 120000),
  cache_ttl_seconds integer not null default 86400 check (cache_ttl_seconds between 60 and 2592000),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.ai_settings (singleton)
values (true)
on conflict (singleton) do nothing;

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  user_role text not null default 'anonymous' check (user_role in ('anonymous', 'user', 'owner', 'system')),
  task text not null check (char_length(task) between 2 and 80),
  provider text not null check (char_length(provider) between 2 and 40),
  model text not null check (char_length(model) between 2 and 100),
  prompt_version text not null check (char_length(prompt_version) between 1 and 40),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  estimated_cost_cents numeric(12, 6) check (estimated_cost_cents is null or estimated_cost_cents >= 0),
  status text not null check (status in ('success', 'failed', 'blocked', 'cached', 'fallback')),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  cache_hit boolean not null default false,
  input_hash text,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_logs_created_at_idx on public.ai_usage_logs (created_at desc);
create index if not exists ai_usage_logs_user_created_idx on public.ai_usage_logs (user_id, created_at desc) where user_id is not null;
create index if not exists ai_usage_logs_task_created_idx on public.ai_usage_logs (task, created_at desc);

create table if not exists public.ai_response_cache (
  cache_key text primary key,
  task text not null check (char_length(task) between 2 and 80),
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  prompt_version text not null,
  provider text not null,
  model text not null,
  expires_at timestamptz not null,
  hit_count integer not null default 0 check (hit_count >= 0),
  last_hit_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ai_response_cache_expires_at_idx on public.ai_response_cache (expires_at);

create table if not exists public.ai_editorial_history (
  id uuid primary key default gen_random_uuid(),
  series_id uuid references public.series(id) on delete set null,
  actor_user_id text not null,
  task text not null check (char_length(task) between 2 and 80),
  original_content jsonb not null default '{}'::jsonb check (jsonb_typeof(original_content) = 'object'),
  suggested_content jsonb not null default '{}'::jsonb check (jsonb_typeof(suggested_content) = 'object'),
  applied_content jsonb check (applied_content is null or jsonb_typeof(applied_content) = 'object'),
  status text not null default 'generated' check (status in ('generated', 'applied', 'rejected')),
  provider text not null,
  model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists ai_editorial_history_series_created_idx on public.ai_editorial_history (series_id, created_at desc);
create index if not exists ai_editorial_history_actor_created_idx on public.ai_editorial_history (actor_user_id, created_at desc);

create table if not exists public.ai_settings_audit (
  id bigint generated by default as identity primary key,
  changed_by text,
  previous_settings jsonb,
  new_settings jsonb not null,
  created_at timestamptz not null default now()
);

create or replace function private.audit_ai_settings_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
begin
  new.updated_at := now();
  insert into public.ai_settings_audit (changed_by, previous_settings, new_settings)
  values (new.updated_by, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

revoke all on function private.audit_ai_settings_change() from public, anon, authenticated;

drop trigger if exists ai_settings_audit_trigger on public.ai_settings;
create trigger ai_settings_audit_trigger
before update on public.ai_settings
for each row execute function private.audit_ai_settings_change();

alter table public.ai_settings enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.ai_response_cache enable row level security;
alter table public.ai_editorial_history enable row level security;
alter table public.ai_settings_audit enable row level security;

revoke all on public.ai_settings from public, anon, authenticated;
revoke all on public.ai_usage_logs from public, anon, authenticated;
revoke all on public.ai_response_cache from public, anon, authenticated;
revoke all on public.ai_editorial_history from public, anon, authenticated;
revoke all on public.ai_settings_audit from public, anon, authenticated;
revoke all on sequence public.ai_settings_audit_id_seq from public, anon, authenticated;

grant select, insert, update on public.ai_settings to service_role;
grant select, insert on public.ai_usage_logs to service_role;
grant select, insert, update, delete on public.ai_response_cache to service_role;
grant select, insert, update on public.ai_editorial_history to service_role;
grant select, insert on public.ai_settings_audit to service_role;
grant usage, select on sequence public.ai_settings_audit_id_seq to service_role;

comment on table public.ai_settings is 'Feature flags, identidade e limites da camada opcional de IA. Nunca armazena chaves de API.';
comment on table public.ai_usage_logs is 'Metadados de consumo de IA sem prompts, respostas ou dados sensíveis integrais.';
comment on table public.ai_response_cache is 'Cache backend de respostas editoriais determinísticas e não privadas.';
comment on table public.ai_editorial_history is 'Histórico de sugestões editoriais submetidas à revisão humana.';
