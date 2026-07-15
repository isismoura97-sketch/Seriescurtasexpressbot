create policy "Deny all public access" on public.user_notification_preferences
  for all to public using (false) with check (false);
create policy "Deny all public access" on public.notification_preference_audit
  for all to public using (false) with check (false);
create policy "Deny all public access" on public.checkout_recoveries
  for all to public using (false) with check (false);
create policy "Deny all public access" on public.checkout_recovery_runtime
  for all to public using (false) with check (false);
