-- Keep sitemap inclusion independent from noindex while preserving all existing pages.
alter table public.series
  add column if not exists seo_sitemap_enabled boolean not null default true;

comment on column public.series.seo_sitemap_enabled is
  'Allows a published, active and indexable series page to appear in the public sitemap.';
