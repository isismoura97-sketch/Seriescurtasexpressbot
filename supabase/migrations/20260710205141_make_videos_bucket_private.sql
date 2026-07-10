update storage.buckets
set public = false
where id = 'videos';

drop policy if exists "Acesso via URL assinada" on storage.objects;
