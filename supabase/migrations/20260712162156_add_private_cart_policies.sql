create policy "Deny direct cart access"
on public.shopping_carts
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny direct coupon redemption access"
on public.coupon_redemptions
for all
to anon, authenticated
using (false)
with check (false);
