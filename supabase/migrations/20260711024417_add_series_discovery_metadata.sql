-- Optional editorial metadata for public discovery and SEO.
-- Existing catalog rows remain valid when these fields are null.

alter table public.series
  add column if not exists slug text,
  add column if not exists alternate_title text,
  add column if not exists short_description text,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists language text,
  add column if not exists subtitle_language text,
  add column if not exists duration_minutes integer,
  add column if not exists release_year integer,
  add column if not exists age_rating text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_dubbed boolean not null default false,
  add column if not exists is_subtitled boolean not null default false,
  add column if not exists backdrop_url text,
  add column if not exists preview_url text;

create unique index if not exists series_slug_unique_idx
  on public.series (lower(slug))
  where slug is not null and length(trim(slug)) > 0;

alter table public.series
  drop constraint if exists series_duration_minutes_check,
  add constraint series_duration_minutes_check
    check (duration_minutes is null or duration_minutes between 1 and 1440),
  drop constraint if exists series_release_year_check,
  add constraint series_release_year_check
    check (release_year is null or release_year between 1900 and 2100);
