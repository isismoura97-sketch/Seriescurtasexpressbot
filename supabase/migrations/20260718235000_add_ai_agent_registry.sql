-- Agent registry foundation. All new capabilities are disabled by default.
alter table public.ai_settings
  add column if not exists ai_editorial_agent_enabled boolean not null default false,
  add column if not exists ai_seo_agent_enabled boolean not null default false,
  add column if not exists ai_catalog_agent_enabled boolean not null default false,
  add column if not exists ai_discovery_agent_enabled boolean not null default false,
  add column if not exists ai_analytics_agent_enabled boolean not null default false,
  add column if not exists ai_marketing_agent_enabled boolean not null default false,
  add column if not exists ai_administration_agent_enabled boolean not null default false,
  add column if not exists ai_support_agent_enabled boolean not null default false,
  add column if not exists ai_rag_enabled boolean not null default false,
  add column if not exists ai_embeddings_enabled boolean not null default false,
  add column if not exists ai_admin_memory_enabled boolean not null default false,
  add column if not exists agent_models jsonb not null default '{}'::jsonb,
  add column if not exists agent_daily_limits jsonb not null default '{}'::jsonb,
  add column if not exists agent_monthly_budgets jsonb not null default '{}'::jsonb;

alter table public.ai_usage_logs
  add column if not exists agent text not null default 'editorial';

alter table public.ai_usage_logs
  drop constraint if exists ai_usage_logs_agent_check;

alter table public.ai_usage_logs
  add constraint ai_usage_logs_agent_check check (agent in (
    'editorial', 'seo', 'catalog', 'discovery',
    'analytics', 'marketing', 'administration', 'support'
  ));

alter table public.ai_response_cache
  add column if not exists agent text not null default 'editorial';

alter table public.ai_response_cache
  drop constraint if exists ai_response_cache_agent_check;

alter table public.ai_response_cache
  add constraint ai_response_cache_agent_check check (agent in (
    'editorial', 'seo', 'catalog', 'discovery',
    'analytics', 'marketing', 'administration', 'support'
  ));

alter table public.ai_editorial_history
  add column if not exists agent text not null default 'editorial';

alter table public.ai_editorial_history
  drop constraint if exists ai_editorial_history_agent_check;

alter table public.ai_editorial_history
  add constraint ai_editorial_history_agent_check check (agent in (
    'editorial', 'seo', 'catalog', 'discovery',
    'analytics', 'marketing', 'administration', 'support'
  ));

create index if not exists ai_usage_logs_agent_created_idx
  on public.ai_usage_logs (agent, created_at desc);

create index if not exists ai_editorial_history_agent_created_idx
  on public.ai_editorial_history (agent, created_at desc);

comment on column public.ai_settings.agent_models is 'Modelos opcionais por agente; nunca contem chaves.';
comment on column public.ai_settings.agent_daily_limits is 'Limites diarios opcionais por agente.';
comment on column public.ai_settings.agent_monthly_budgets is 'Orcamentos mensais opcionais por agente, em centavos.';
