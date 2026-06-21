-- Escrow-gated chat (PRD §6.4–6.5, §14). Chat lives inside an inspection
-- session and only unlocks after the renter pays the inspection fee (escrow).

-- ---------------------------------------------------------------------------
-- inspection_sessions — the conversation spine
-- ---------------------------------------------------------------------------
create table if not exists public.inspection_sessions (
  id                 uuid primary key default gen_random_uuid(),
  enquiry_id         uuid references public.enquiries (id) on delete set null,
  listing_id         uuid not null references public.listings (id) on delete cascade,
  agent_id           uuid not null references public.users (id) on delete cascade,
  renter_id          uuid references public.users (id) on delete set null,
  renter_name        text not null,
  inspection_fee     numeric not null default 0,
  inspection_code    text,
  scheduled_date     date,
  status             text not null default 'scheduled'
                       check (status in ('scheduled','reschedule_pending','escrow_held','in_progress','completed','disputed','refunded','cancelled')),
  proposed_date      date,
  proposed_by        text check (proposed_by in ('agent','renter')),
  chat_unlocked      boolean not null default false,
  code_confirmed_at  timestamptz,
  escrow_release_at  timestamptz,
  last_message       text,
  last_message_at    timestamptz,
  paystack_reference text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists inspection_sessions_agent_idx on public.inspection_sessions (agent_id);
create index if not exists inspection_sessions_listing_idx on public.inspection_sessions (listing_id);

drop trigger if exists inspection_sessions_set_updated_at on public.inspection_sessions;
create trigger inspection_sessions_set_updated_at
  before update on public.inspection_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.inspection_sessions (id) on delete cascade,
  sender_role text not null check (sender_role in ('agent','renter','system')),
  sender_id   uuid references public.users (id) on delete set null,
  type        text not null default 'text' check (type in ('text','image','system')),
  body        text,
  image_url   text,
  reply_to    uuid references public.messages (id) on delete set null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create index if not exists messages_session_idx on public.messages (session_id, created_at);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.inspection_sessions enable row level security;
alter table public.messages enable row level security;

-- Helper predicate inlined: agent owns the session, or is the admin of the
-- listing's agency.
create policy "sessions_select" on public.inspection_sessions
  for select using (
    agent_id = auth.uid()
    or exists (
      select 1 from public.listings l
      join public.agencies a on a.id = l.agency_id
      where l.id = inspection_sessions.listing_id and a.admin_id = auth.uid()
    )
  );
create policy "sessions_insert" on public.inspection_sessions
  for insert with check (agent_id = auth.uid());
create policy "sessions_update" on public.inspection_sessions
  for update using (
    agent_id = auth.uid()
    or exists (
      select 1 from public.listings l
      join public.agencies a on a.id = l.agency_id
      where l.id = inspection_sessions.listing_id and a.admin_id = auth.uid()
    )
  )
  with check (true);

create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.inspection_sessions s
      where s.id = messages.session_id
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
create policy "messages_insert" on public.messages
  for insert with check (
    sender_role = 'agent'
    and sender_id = auth.uid()
    and exists (
      select 1 from public.inspection_sessions s
      where s.id = messages.session_id and s.agent_id = auth.uid()
    )
  );
-- Agent can mark messages read (read receipts).
create policy "messages_update" on public.messages
  for update using (
    exists (
      select 1 from public.inspection_sessions s
      where s.id = messages.session_id and s.agent_id = auth.uid()
    )
  )
  with check (true);

-- ---------------------------------------------------------------------------
-- Keep the session's last-message preview in sync (security definer so it can
-- update regardless of which side sent the message).
-- ---------------------------------------------------------------------------
create or replace function public.touch_session_last_message()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.inspection_sessions
    set last_message = coalesce(
          new.body,
          case when new.type = 'image' then '📷 Photo' else '' end
        ),
        last_message_at = new.created_at
    where id = new.session_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_session on public.messages;
create trigger messages_touch_session
  after insert on public.messages
  for each row execute function public.touch_session_last_message();

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.inspection_sessions;
