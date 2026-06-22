-- subscriptions (PRD §10) + a trial seed for the test account.
create table if not exists public.subscriptions (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid references public.users (id) on delete cascade,
  agency_id                  uuid references public.agencies (id) on delete set null,
  plan                       text check (plan in ('starter','pro','agency_starter','agency_growth')),
  billing_cycle              text check (billing_cycle in ('monthly','annual')),
  status                     text check (status in ('trial','active','expired','cancelled')),
  trial_ends_at              timestamptz,
  current_period_start       timestamptz,
  current_period_end         timestamptz,
  paystack_customer_id       text,
  paystack_subscription_code text,
  created_at                 timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);
create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);
create policy "subscriptions_update_own" on public.subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed a free-trial subscription for the test user (idempotent).
do $$
declare
  uid uuid;
begin
  select id into uid from public.users where email = 'belloolamilekan661@gmail.com' limit 1;
  if uid is null then
    raise notice 'Seed skipped: test user not found';
    return;
  end if;
  if exists (select 1 from public.subscriptions where user_id = uid) then
    raise notice 'Seed skipped: subscription already exists';
    return;
  end if;
  insert into public.subscriptions (user_id, plan, billing_cycle, status, trial_ends_at, created_at)
  values (uid, 'pro', 'monthly', 'trial', now() + interval '10 days', now());
  raise notice 'Seed done: trial subscription for %', uid;
end $$;
