-- Store free/paid intent independently from an unfinished draft price.
alter table public.series
  add column if not exists access_type text;

update public.series
set access_type = case
  when lower(coalesce(access_type, '')) in ('free', 'paid') then lower(access_type)
  when coalesce(price_cents, round(coalesce(price, 0)::numeric * 100)::integer, 0) > 0 then 'paid'
  else 'free'
end;

alter table public.series
  alter column access_type set default 'paid',
  alter column access_type set not null,
  drop constraint if exists series_access_type_check,
  add constraint series_access_type_check check (access_type in ('free', 'paid'));
