-- Credencial por papel administrativo: somente hash SHA-256, nunca senha em texto.

alter table public.admin_access_roles
  add column if not exists password_sha256 text;

alter table public.admin_access_roles
  drop constraint if exists admin_access_roles_password_hash_check;

alter table public.admin_access_roles
  add constraint admin_access_roles_password_hash_check
  check (password_sha256 is null or password_sha256 ~ '^[0-9a-fA-F]{64}$');

comment on column public.admin_access_roles.password_sha256 is
  'Hash SHA-256 da senha específica do papel; nunca armazenar a senha original.';
