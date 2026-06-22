-- Escrow + dispute layer (PRD §14), reconciled to the actual chat schema
-- (chat lives inside inspection_sessions; messages.session_id; no conversations
-- table). Adds typed system-message metadata, GPS/scheduled-time fields,
-- dispute/evidence tables, a private chat-media bucket, RLS, and realtime.

-- Typed system messages (payment_received, inspection_started, escrow_released,
-- dispute_raised, evidence_recorded, dispute_resolved, ...).
alter table public.messages add column if not exists metadata jsonb;

-- Inspection session: scheduled time + GPS proximity (for dispute location check).
alter table public.inspection_sessions
  add column if not exists scheduled_time text,
  add column if not exists renter_gps_lat numeric,
  add column if not exists renter_gps_lng numeric,
  add column if not exists agent_gps_lat numeric,
  add column if not exists agent_gps_lng numeric,
  add column if not exists gps_proximity_metres numeric;

-- ---------------------------------------------------------------------------
-- disputes
-- ---------------------------------------------------------------------------
create table if not exists public.disputes (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.inspection_sessions (id) on delete cascade,
  raised_by   uuid references public.users (id) on delete set null,
  reason      text not null,
  description text,
  status      text not null default 'open'
                check (status in ('open','under_review','resolved_agent_fault','resolved_renter_fault','inconclusive')),
  resolved_by uuid references public.users (id) on delete set null,
  admin_notes text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists disputes_session_idx on public.disputes (session_id);

-- ---------------------------------------------------------------------------
-- inspection_evidence
-- ---------------------------------------------------------------------------
create table if not exists public.inspection_evidence (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.inspection_sessions (id) on delete cascade,
  submitted_by text not null check (submitted_by in ('agent','renter')),
  type         text not null check (type in ('photo','video')),
  url          text not null,
  uploaded_at  timestamptz not null default now()
);
create index if not exists inspection_evidence_session_idx on public.inspection_evidence (session_id);

-- ---------------------------------------------------------------------------
-- dispute_responses
-- ---------------------------------------------------------------------------
create table if not exists public.dispute_responses (
  id           uuid primary key default gen_random_uuid(),
  dispute_id   uuid not null references public.disputes (id) on delete cascade,
  submitted_by uuid references public.users (id) on delete set null,
  statement    text,
  created_at   timestamptz not null default now()
);
create index if not exists dispute_responses_dispute_idx on public.dispute_responses (dispute_id);

-- ---------------------------------------------------------------------------
-- RLS — agent of the session (or the agency admin) can read; agent writes
-- their own evidence + dispute responses.
-- ---------------------------------------------------------------------------
alter table public.disputes enable row level security;
alter table public.inspection_evidence enable row level security;
alter table public.dispute_responses enable row level security;

create policy "disputes_select" on public.disputes
  for select using (
    exists (
      select 1 from public.inspection_sessions s
      where s.id = disputes.session_id
        and (
          s.agent_id = auth.uid()
          or exists (
            select 1 from public.listings l
            join public.agencies a on a.id = l.agency_id
            where l.id = s.listing_id and a.admin_id = auth.uid()
          )
        )
    )
  );

create policy "evidence_select" on public.inspection_evidence
  for select using (
    exists (
      select 1 from public.inspection_sessions s
      where s.id = inspection_evidence.session_id
        and (
          s.agent_id = auth.uid()
          or exists (
            select 1 from public.listings l
            join public.agencies a on a.id = l.agency_id
            where l.id = s.listing_id and a.admin_id = auth.uid()
          )
        )
    )
  );
create policy "evidence_insert_agent" on public.inspection_evidence
  for insert with check (
    submitted_by = 'agent'
    and exists (
      select 1 from public.inspection_sessions s
      where s.id = inspection_evidence.session_id and s.agent_id = auth.uid()
    )
  );

create policy "dispute_responses_select" on public.dispute_responses
  for select using (
    exists (
      select 1 from public.disputes d
      join public.inspection_sessions s on s.id = d.session_id
      where d.id = dispute_responses.dispute_id and s.agent_id = auth.uid()
    )
  );
create policy "dispute_responses_insert" on public.dispute_responses
  for insert with check (
    submitted_by = auth.uid()
    and exists (
      select 1 from public.disputes d
      join public.inspection_sessions s on s.id = d.session_id
      where d.id = dispute_responses.dispute_id and s.agent_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Private bucket for chat + inspection evidence media.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

create policy "chat_media_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "chat_media_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Realtime: dispute resolution notifications.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.disputes;
