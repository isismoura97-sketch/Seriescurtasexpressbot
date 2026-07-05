create table if not exists public.user_series_progress (
  user_id text not null,
  series_id text not null,
  series_title text,
  category text,
  last_position_seconds numeric(10,2) not null default 0,
  duration_seconds numeric(10,2),
  completion_percent numeric(5,2) not null default 0,
  last_event text not null default 'opened',
  last_playback_mode text not null default 'direct',
  watch_count integer not null default 0,
  completed boolean not null default false,
  first_opened_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_series_progress_pkey primary key (user_id, series_id)
);

create index if not exists user_series_progress_user_last_opened_idx
  on public.user_series_progress (user_id, last_opened_at desc);

create index if not exists user_series_progress_series_idx
  on public.user_series_progress (series_id);

alter table public.user_series_progress enable row level security;

drop policy if exists "Deny all public access" on public.user_series_progress;
create policy "Deny all public access"
  on public.user_series_progress
  for all
  to public
  using (false)
  with check (false);
