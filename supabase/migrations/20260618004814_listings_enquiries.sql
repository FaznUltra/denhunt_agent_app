-- DenHunt: listings, listing_media, enquiries, agency_members + RLS.
-- Mirrors docs/DenHunt_Agent_PRD_v1.1.md Section 10. Needed by the dashboard.

-- ---------------------------------------------------------------------------
-- agency_members
-- ---------------------------------------------------------------------------
create table if not exists public.agency_members (
  id                uuid primary key default gen_random_uuid(),
  agency_id         uuid not null references public.agencies (id) on delete cascade,
  user_id           uuid not null references public.users (id) on delete cascade,
  invite_token      text unique,
  invite_expires_at timestamptz,
  status            text not null default 'invited'
                      check (status in ('invited','active','removed')),
  joined_at         timestamptz
);

create index if not exists agency_members_agency_id_idx on public.agency_members (agency_id);
create index if not exists agency_members_user_id_idx on public.agency_members (user_id);

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------
create table if not exists public.listings (
  id                 uuid primary key default gen_random_uuid(),
  posted_by          uuid not null references public.users (id) on delete cascade,
  agency_id          uuid references public.agencies (id) on delete set null,
  title              text not null,
  description        text,
  category           text,
  purpose            text,
  bedrooms           integer not null default 0,
  bathrooms          integer not null default 0,
  toilets            integer not null default 0,
  furnishing         text,
  floor              text,
  size_sqm           numeric,
  year_built         integer,
  parking            text,
  land_size          text,
  amenities          text[] default '{}',
  state              text,
  lga                text,
  area               text,
  street_address     text,
  show_exact_address boolean not null default false,
  latitude           numeric,
  longitude          numeric,
  price              numeric not null default 0,
  payment_frequency  text,
  caution_fee        text,
  agency_fee         text,
  service_charge     numeric,
  price_negotiable   boolean not null default false,
  available_from     date,
  available_until    date,
  occupancy_status   text,
  status             text not null default 'draft'
                       check (status in ('draft','pending_review','active','paused','rented_sold','rejected','expired')),
  rejection_reason   text,
  views_count        integer not null default 0,
  enquiries_count    integer not null default 0,
  expires_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists listings_posted_by_idx on public.listings (posted_by);
create index if not exists listings_agency_id_idx on public.listings (agency_id);
create index if not exists listings_status_idx on public.listings (status);

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- listing_media
-- ---------------------------------------------------------------------------
create table if not exists public.listing_media (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings (id) on delete cascade,
  type        text not null check (type in ('photo','video')),
  url         text not null,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists listing_media_listing_id_idx on public.listing_media (listing_id);

-- ---------------------------------------------------------------------------
-- enquiries
-- ---------------------------------------------------------------------------
create table if not exists public.enquiries (
  id                        uuid primary key default gen_random_uuid(),
  listing_id                uuid not null references public.listings (id) on delete cascade,
  agent_id                  uuid not null references public.users (id) on delete cascade,
  enquirer_name             text not null,
  enquirer_phone            text not null,
  enquirer_email            text,
  message                   text,
  preferred_inspection_date date,
  status                    text not null default 'new'
                              check (status in ('new','contacted','inspection_scheduled','closed','not_interested')),
  created_at                timestamptz not null default now()
);

create index if not exists enquiries_agent_id_idx on public.enquiries (agent_id);
create index if not exists enquiries_listing_id_idx on public.enquiries (listing_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.agency_members enable row level security;
alter table public.listings enable row level security;
alter table public.listing_media enable row level security;
alter table public.enquiries enable row level security;

-- listings: owner agent, or the admin of the listing's agency.
create policy "listings_select" on public.listings
  for select using (
    posted_by = auth.uid()
    or exists (select 1 from public.agencies a
               where a.id = listings.agency_id and a.admin_id = auth.uid())
  );
create policy "listings_insert" on public.listings
  for insert with check (posted_by = auth.uid());
create policy "listings_update" on public.listings
  for update using (
    posted_by = auth.uid()
    or exists (select 1 from public.agencies a
               where a.id = listings.agency_id and a.admin_id = auth.uid())
  ) with check (
    posted_by = auth.uid()
    or exists (select 1 from public.agencies a
               where a.id = listings.agency_id and a.admin_id = auth.uid())
  );

-- listing_media: visible/insertable when the parent listing is.
create policy "listing_media_select" on public.listing_media
  for select using (
    exists (select 1 from public.listings l
            where l.id = listing_media.listing_id
              and (l.posted_by = auth.uid()
                   or exists (select 1 from public.agencies a
                              where a.id = l.agency_id and a.admin_id = auth.uid())))
  );
create policy "listing_media_insert" on public.listing_media
  for insert with check (
    exists (select 1 from public.listings l
            where l.id = listing_media.listing_id and l.posted_by = auth.uid())
  );

-- enquiries: the receiving agent, or the admin of the listing's agency.
create policy "enquiries_select" on public.enquiries
  for select using (
    agent_id = auth.uid()
    or exists (select 1 from public.listings l
               join public.agencies a on a.id = l.agency_id
               where l.id = enquiries.listing_id and a.admin_id = auth.uid())
  );

-- agency_members: the member themselves, or the agency admin.
create policy "agency_members_select" on public.agency_members
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.agencies a
               where a.id = agency_members.agency_id and a.admin_id = auth.uid())
  );
create policy "agency_members_insert" on public.agency_members
  for insert with check (
    exists (select 1 from public.agencies a
            where a.id = agency_members.agency_id and a.admin_id = auth.uid())
  );

-- users: allow an agency admin to read their team members' rows (for the
-- dashboard team preview). Adds to the existing self-only select policy.
create policy "users_select_agency_team" on public.users
  for select using (
    exists (
      select 1 from public.agency_members m
      join public.agencies a on a.id = m.agency_id
      where m.user_id = users.id and a.admin_id = auth.uid()
    )
  );
