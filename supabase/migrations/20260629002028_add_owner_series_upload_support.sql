-- Support owner uploads for cover, trailer and full video media.

alter table public.series
  add column if not exists video_url text,
  add column if not exists video_storage_path text,
  add column if not exists trailer_url text,
  add column if not exists trailer_storage_path text;

insert into storage.buckets (id, name, public)
values
  ('covers', 'covers', true),
  ('trailers', 'trailers', true),
  ('videos', 'videos', true)
on conflict (id) do update
set public = excluded.public,
    name = excluded.name;
