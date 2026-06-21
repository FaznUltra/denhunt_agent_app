-- Let the session's agent post system messages too (e.g. reschedule events),
-- in addition to their own agent messages.
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    exists (
      select 1 from public.inspection_sessions s
      where s.id = messages.session_id and s.agent_id = auth.uid()
    )
    and (
      (sender_role = 'agent' and sender_id = auth.uid())
      or (sender_role = 'system' and sender_id is null)
    )
  );
