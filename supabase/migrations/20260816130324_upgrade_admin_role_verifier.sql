-- Troca o campo de hash simples por um verificador PBKDF2 com salt.

alter table public.admin_access_roles
  rename column password_sha256 to password_verifier;

alter table public.admin_access_roles
  drop constraint if exists admin_access_roles_password_hash_check;

alter table public.admin_access_roles
  add constraint admin_access_roles_password_verifier_check
  check (
    password_verifier is null
    or password_verifier ~ '^pbkdf2-sha256\\$[1-9][0-9]{4,6}\\$[A-Za-z0-9_-]+\\$[A-Za-z0-9_-]+$'
  );

comment on column public.admin_access_roles.password_verifier is
  'Verificador PBKDF2-SHA-256 no formato pbkdf2-sha256$iterations$salt$derived_key.';
