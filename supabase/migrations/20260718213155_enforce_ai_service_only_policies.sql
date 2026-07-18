-- These tables are intentionally backend-only. The service_role bypasses RLS;
-- every browser-facing database role is denied explicitly.
drop policy if exists ai_settings_service_only on public.ai_settings;
create policy ai_settings_service_only
on public.ai_settings for all to public
using (false)
with check (false);

drop policy if exists ai_usage_logs_service_only on public.ai_usage_logs;
create policy ai_usage_logs_service_only
on public.ai_usage_logs for all to public
using (false)
with check (false);

drop policy if exists ai_response_cache_service_only on public.ai_response_cache;
create policy ai_response_cache_service_only
on public.ai_response_cache for all to public
using (false)
with check (false);

drop policy if exists ai_editorial_history_service_only on public.ai_editorial_history;
create policy ai_editorial_history_service_only
on public.ai_editorial_history for all to public
using (false)
with check (false);

drop policy if exists ai_settings_audit_service_only on public.ai_settings_audit;
create policy ai_settings_audit_service_only
on public.ai_settings_audit for all to public
using (false)
with check (false);
