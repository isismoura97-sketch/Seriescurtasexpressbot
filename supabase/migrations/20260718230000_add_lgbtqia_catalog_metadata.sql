-- Non-destructive editorial metadata for LGBTQIA+ representation.
-- The existing category column remains the primary/backward-compatible label.

alter table public.series
  add column if not exists categories text[] not null default '{}'::text[],
  add column if not exists is_lgbtqia_content boolean not null default false,
  add column if not exists lgbtqia_editorial_description text,
  add column if not exists content_warnings text[] not null default '{}'::text[];

update public.series
set categories = array_remove(
  regexp_split_to_array(coalesce(category, ''), '\s*[,/|;]\s*'),
  ''
)
where coalesce(array_length(categories, 1), 0) = 0
  and nullif(trim(category), '') is not null;

alter table public.series
  drop constraint if exists series_lgbtqia_editorial_description_length_check,
  add constraint series_lgbtqia_editorial_description_length_check
    check (lgbtqia_editorial_description is null or char_length(lgbtqia_editorial_description) <= 1000);

create index if not exists series_categories_gin_idx
  on public.series using gin (categories);

create index if not exists series_tags_gin_idx
  on public.series using gin (tags);

comment on column public.series.categories is
  'Editorial categories; a series can belong to several categories.';
comment on column public.series.is_lgbtqia_content is
  'Manual editorial confirmation that the published content has LGBTQIA+ representation or themes.';
comment on column public.series.lgbtqia_editorial_description is
  'Internal editorial basis for the LGBTQIA+ classification; never shown publicly.';
comment on column public.series.content_warnings is
  'Optional content warnings reviewed by the owner before publication.';
