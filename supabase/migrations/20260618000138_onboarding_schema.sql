-- DenHunt onboarding schema: users, agencies, identity_verifications
-- + storage buckets (avatars, identity-docs) + RLS policies.
-- Mirrors docs/DenHunt_Agent_PRD_v1.1.md Section 10 (onboarding subset).

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id                  uuid primary key references auth.users (id) on delete cascade,
  phone               text unique not null,
  email               text,
  full_name           text not null,
  profile_photo_url   text,
  role                text not null
                        check (role in ('individual_agent','agency_admin','agency_agent','renter','personal_inspector','admin')),
  status              text not null default 'pending'
                        check (status in ('pending','active','suspended','banned')),
  verification_status text not null default 'unverified'
                        check (verification_status in ('unverified','pending','verified','rejected')),
  years_experience    text,
  areas               text[] default '{}',
  property_types      text[] default '{}',
  bio                 text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- agencies
-- ---------------------------------------------------------------------------
create table if not exists public.agencies (
  id                  uuid primary key default gen_random_uuid(),
  admin_id            uuid not null references public.users (id) on delete cascade,
  name                text not null,
  cac_number          text,
  logo_url            text,
  office_address      text,
  website             text,
  subscription_plan   text,
  verification_status text not null default 'pending'
                        check (verification_status in ('pending','verified','rejected')),
  status              text not null default 'active'
                        check (status in ('active','suspended','banned')),
  created_at          timestamptz not null default now()
);

create index if not exists agencies_admin_id_idx on public.agencies (admin_id);

-- ---------------------------------------------------------------------------
-- identity_verifications
-- ---------------------------------------------------------------------------
create table if not exists public.identity_verifications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  id_type          text not null
                     check (id_type in ('nin','drivers_licence','passport','voters_card')),
  id_front_url     text not null,
  id_back_url      text,
  bvn              text not null,
  kyc_provider_ref text,
  kyc_status       text not null default 'pending'
                     check (kyc_status in ('pending','passed','failed')),
  kyc_result       jsonb,
  reviewed_by      uuid references public.users (id),
  created_at       timestamptz not null default now()
);

create index if not exists identity_verifications_user_id_idx
  on public.identity_verifications (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.agencies enable row level security;
alter table public.identity_verifications enable row level security;

-- users: a user can only read/insert/update their own row.
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- agencies: only the owning admin can read/insert/update.
create policy "agencies_select_own" on public.agencies
  for select using (auth.uid() = admin_id);
create policy "agencies_insert_own" on public.agencies
  for insert with check (auth.uid() = admin_id);
create policy "agencies_update_own" on public.agencies
  for update using (auth.uid() = admin_id) with check (auth.uid() = admin_id);

-- identity_verifications: owner can read/insert their own records.
create policy "idv_select_own" on public.identity_verifications
  for select using (auth.uid() = user_id);
create policy "idv_insert_own" on public.identity_verifications
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('identity-docs', 'identity-docs', false)
on conflict (id) do nothing;

-- avatars (public read; users manage only their own {uid}/... folder).
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_read_all" on storage.objects
  for select using (bucket_id = 'avatars');

-- identity-docs (private; owner-only read/insert).
create policy "identity_docs_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'identity-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "identity_docs_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'identity-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
