-- Filebench by Kalaburagi Labs — accounts, plans, credits, usage limits and payments.
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run  (or: supabase db push)
--
-- Security model
--   * Users can READ only their own rows (row-level security).
--   * Nobody can WRITE plans, credits or payments from the browser. Those change only through
--     the SECURITY DEFINER functions below, called by signed-in users (use_task) or by the
--     payment Edge Functions with the service-role key (apply_*).

-- ───────────────────────────────────────────── tables
create table if not exists public.profiles (
  id                        uuid primary key references auth.users (id) on delete cascade,
  email                     text,
  phone                     text,
  full_name                 text,
  plan                      text not null default 'free' check (plan in ('free', 'pro', 'lifetime')),
  pro_until                 timestamptz,
  credits                   integer not null default 0 check (credits >= 0),
  razorpay_subscription_id  text,
  subscription_status       text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create table if not exists public.usage_daily (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  day        date not null,
  tasks      integer not null default 0,
  ocr_pages  integer not null default 0,
  primary key (user_id, day)
);

-- Payment records are kept after an account is deleted (tax/GST record keeping), but unlinked.
create table if not exists public.payments (
  id                        bigint generated always as identity primary key,
  user_id                   uuid references public.profiles (id) on delete set null,
  product                   text not null,
  kind                      text not null check (kind in ('subscription', 'one_time')),
  amount_paise              integer not null check (amount_paise >= 0),
  currency                  text not null default 'INR',
  grant_plan                text check (grant_plan in ('lifetime')),
  grant_credits             integer not null default 0,
  razorpay_order_id         text unique,
  razorpay_subscription_id  text,
  razorpay_payment_id       text unique,
  status                    text not null default 'created' check (status in ('created', 'paid', 'failed', 'refunded')),
  created_at                timestamptz not null default now(),
  paid_at                   timestamptz
);
create index if not exists payments_user_idx on public.payments (user_id);
create index if not exists payments_sub_idx on public.payments (razorpay_subscription_id);

-- ───────────────────────────────────────────── row-level security (read own rows only)
alter table public.profiles    enable row level security;
alter table public.usage_daily enable row level security;
alter table public.payments    enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "read own usage" on public.usage_daily;
create policy "read own usage" on public.usage_daily for select to authenticated using (auth.uid() = user_id);
drop policy if exists "read own payments" on public.payments;
create policy "read own payments" on public.payments for select to authenticated using (auth.uid() = user_id);

revoke insert, update, delete on public.profiles, public.usage_daily, public.payments from anon, authenticated;

-- ───────────────────────────────────────────── create a profile for every new sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, phone, full_name)
  values (new.id, new.email, new.phone,
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────────────────────── plan helpers
create or replace function public.is_paid(p public.profiles)
returns boolean language sql stable as $$
  select p.plan = 'lifetime' or (p.plan = 'pro' and p.pro_until is not null and p.pro_until > now())
$$;

-- ───────────────────────────────────────────── usage limits + credits
-- Called by the app before a task runs. Free-plan limits (keep in sync with PLAN_LIMITS in index.html):
--   25 tasks a day · 5 files per task · 20 MB per file · 5 OCR pages a day.
-- Going over a limit costs credits: 1 per extra task, 1 per extra file, 1 per started 50 MB over the
-- size limit, 1 per extra OCR page. First call with p_confirm = false to get the price; call again with
-- p_confirm = true (after the user agrees) to spend the credits.
create or replace function public.use_task(
  p_tool       text,
  p_files      integer default 1,
  p_max_mb     numeric default 0,
  p_ocr_pages  integer default 0,
  p_confirm    boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid        uuid := auth.uid();
  prof       public.profiles;
  u          public.usage_daily;
  today      date := (now() at time zone 'Asia/Kolkata')::date;
  free_tasks constant integer := 25;
  free_files constant integer := 5;
  free_mb    constant numeric := 20;
  free_ocr   constant integer := 5;
  cost       integer := 0;
  reasons    text[] := '{}';
begin
  if uid is null then
    raise exception 'Sign in first' using errcode = '28000';
  end if;
  if coalesce(p_files, 0) < 0 or coalesce(p_ocr_pages, 0) < 0 or coalesce(p_max_mb, 0) < 0
     or p_files > 10000 or p_ocr_pages > 100000 or length(coalesce(p_tool, '')) > 40 then
    raise exception 'Invalid request' using errcode = '22023';
  end if;

  select * into prof from public.profiles where id = uid for update;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  insert into public.usage_daily (user_id, day) values (uid, today) on conflict do nothing;
  select * into u from public.usage_daily where user_id = uid and day = today for update;

  if public.is_paid(prof) then
    update public.usage_daily set tasks = tasks + 1, ocr_pages = ocr_pages + coalesce(p_ocr_pages, 0)
     where user_id = uid and day = today;
    return jsonb_build_object('ok', true, 'paid', true, 'credits', prof.credits, 'tasks_today', u.tasks + 1);
  end if;

  if u.tasks >= free_tasks then
    cost := cost + 1;  reasons := reasons || 'daily_tasks'::text;
  end if;
  if p_files > free_files then
    cost := cost + (p_files - free_files);  reasons := reasons || 'batch_size'::text;
  end if;
  if p_max_mb > free_mb then
    cost := cost + ceil((p_max_mb - free_mb) / 50.0)::integer;  reasons := reasons || 'file_size'::text;
  end if;
  if p_ocr_pages > 0 and u.ocr_pages + p_ocr_pages > free_ocr then
    cost := cost + (u.ocr_pages + p_ocr_pages - greatest(free_ocr, u.ocr_pages));  reasons := reasons || 'ocr_pages'::text;
  end if;

  if cost > 0 and not coalesce(p_confirm, false) then
    return jsonb_build_object('ok', false, 'cost', cost, 'credits', prof.credits,
                              'reasons', to_jsonb(reasons), 'tasks_today', u.tasks);
  end if;
  if cost > prof.credits then
    return jsonb_build_object('ok', false, 'error', 'not_enough_credits', 'cost', cost,
                              'credits', prof.credits, 'reasons', to_jsonb(reasons), 'tasks_today', u.tasks);
  end if;

  update public.profiles set credits = credits - cost, updated_at = now() where id = uid;
  update public.usage_daily set tasks = tasks + 1, ocr_pages = ocr_pages + coalesce(p_ocr_pages, 0)
   where user_id = uid and day = today;
  return jsonb_build_object('ok', true, 'paid', false, 'cost', cost, 'credits', prof.credits - cost,
                            'tasks_today', u.tasks + 1);
end $$;

-- ───────────────────────────────────────────── payment grants (service role only)
-- One-time purchases (lifetime, credit packs). Idempotent: safe to call from both
-- verify-payment and the webhook.
create or replace function public.apply_order_payment(p_order_id text, p_payment_id text)
returns text language plpgsql security definer set search_path = public as $$
declare pay public.payments;
begin
  select * into pay from public.payments where razorpay_order_id = p_order_id for update;
  if not found then return 'unknown_order'; end if;
  if pay.status = 'paid' then return 'already_applied'; end if;
  update public.payments set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now() where id = pay.id;
  if pay.user_id is null then return 'no_user'; end if;
  if pay.grant_plan = 'lifetime' then
    update public.profiles set plan = 'lifetime', updated_at = now() where id = pay.user_id;
  end if;
  if pay.grant_credits > 0 then
    update public.profiles set credits = credits + pay.grant_credits, updated_at = now() where id = pay.user_id;
  end if;
  return 'applied';
end $$;

-- Subscriptions: called with the subscription's current status and the end of the paid period.
create or replace function public.apply_subscription(
  p_subscription_id text, p_status text, p_current_end timestamptz, p_payment_id text default null
) returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  first_pay public.payments;
  active boolean := p_status in ('active', 'authenticated', 'charged', 'resumed');
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

-- ───────────────────────────────────────────── who may call what
revoke all on function public.use_task(text, integer, numeric, integer, boolean) from public, anon;
grant execute on function public.use_task(text, integer, numeric, integer, boolean) to authenticated;
revoke all on function public.apply_order_payment(text, text) from public, anon, authenticated;
revoke all on function public.apply_subscription(text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.apply_order_payment(text, text) to service_role;
grant execute on function public.apply_subscription(text, text, timestamptz, text) to service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated;
