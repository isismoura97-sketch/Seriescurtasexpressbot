create table if not exists public.user_series_favorites (
  user_id text not null,
  series_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_series_favorites_pkey primary key (user_id, series_id)
);

create index if not exists user_series_favorites_user_updated_idx
  on public.user_series_favorites (user_id, updated_at desc);

create index if not exists user_series_favorites_series_idx
  on public.user_series_favorites (series_id);

alter table public.user_series_favorites enable row level security;

drop policy if exists "Deny all public access" on public.user_series_favorites;
create policy "Deny all public access"
  on public.user_series_favorites
  for all
  to public
  using (false)
  with check (false);
