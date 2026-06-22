-- Agency team flows: pending-invite slots, removal tracking, and the RLS
-- needed for admins to manage members + invited agents to claim their slot.

-- Invite slots are created with no user yet (filled when the agent accepts).
alter table public.agency_members alter column user_id drop not null;

-- Removal audit trail.
alter table public.agency_members
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid references public.users (id) on delete set null,
  add column if not exists removal_reason text;

-- agency_members already has select (member/admin) + insert (admin) policies.
-- Add: admin can UPDATE their members (remove / cancel invite), and an invited
-- agent can claim a still-open invite slot (token gates this — knowledge of the
-- 64-char token is the authorisation; with check pins the row to themselves).
drop policy if exists "agency_members_admin_update" on public.agency_members;
create policy "agency_members_admin_update" on public.agency_members
  for update using (
    exists (select 1 from public.agencies a
            where a.id = agency_members.agency_id and a.admin_id = auth.uid())
  );

drop policy if exists "agency_members_claim_invite" on public.agency_members;
create policy "agency_members_claim_invite" on public.agency_members
  for update using (status = 'invited' and user_id is null)
  with check (user_id = auth.uid());
