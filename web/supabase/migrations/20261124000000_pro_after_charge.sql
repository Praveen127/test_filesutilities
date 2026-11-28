-- Fileutilo: grant Pro only after the first subscription charge, not when a mandate is merely authorised.
-- Run once in Supabase → SQL Editor (safe to re-run).
-- Subscriptions: called with the subscription's current status and the end of the paid period.
create or replace function public.apply_subscription(
  p_subscription_id text, p_status text, p_current_end timestamptz, p_payment_id text default null
) returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  first_pay public.payments;
  active boolean := p_status in ('active', 'charged', 'resumed');
begin
  select * into first_pay from public.payments
   where razorpay_subscription_id = p_subscription_id order by id limit 1 for update;
  if not found then return 'unknown_subscription'; end if;
  uid := first_pay.user_id;
  if uid is null then return 'no_user'; end if;

  if p_payment_id is not null then
    if first_pay.status = 'created' then
      update public.payments set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now() where id = first_pay.id;
    elsif not exists (select 1 from public.payments where razorpay_payment_id = p_payment_id) then
      insert into public.payments (user_id, product, kind, amount_paise, currency, razorpay_subscription_id,
                                   razorpay_payment_id, status, paid_at)
      values (uid, first_pay.product, 'subscription', first_pay.amount_paise, first_pay.currency,
              p_subscription_id, p_payment_id, 'paid', now());
    end if;
  end if;

  update public.profiles set
    plan = case when plan = 'lifetime' then 'lifetime'
                when active then 'pro' else plan end,
    pro_until = case when active and p_current_end is not null
                     then greatest(coalesce(pro_until, now()), p_current_end + interval '1 day')
                     else pro_until end,
    razorpay_subscription_id = p_subscription_id,
    subscription_status = p_status,
    updated_at = now()
  where id = uid;
  return 'applied';
end $$;

revoke all on function public.apply_subscription(text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.apply_subscription(text, text, timestamptz, text) to service_role;
