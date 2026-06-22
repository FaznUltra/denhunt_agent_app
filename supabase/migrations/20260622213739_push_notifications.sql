-- Push notifications: device tokens + in-app notification history.
-- Free-tier architecture (no Database Webhooks): clients call the send-push
-- Edge Function after a write; server-originated events (auto-release) call it
-- with the service role. See PRD §6.4.

-- Device push tokens (one row per user+token).
create table if not exists public.device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  token      text not null,
  platform   text not null check (platform in ('ios', 'android')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

alter table public.device_tokens enable row level security;

create policy "users_own_tokens"
  on public.device_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- In-app notification history (backs the bell icon).
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  title      text not null,
  body       text not null,
  type       text not null,
  -- new_message | inspection_scheduled | escrow_released | dispute_raised |
  -- dispute_resolved | listing_approved | listing_rejected | verification_complete
  data       jsonb,           -- { session_id, listing_id, screen } for deep linking
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Single FOR ALL policy: USING gates SELECT/UPDATE/DELETE; with WITH CHECK it
-- also gates INSERT. This is all Realtime SELECT needs too.
create policy "users_own_notifications"
  on public.notifications for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, is_read)
  where is_read = false;

-- Realtime for live bell updates.
alter publication supabase_realtime add table public.notifications;
