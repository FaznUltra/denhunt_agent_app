-- Seed inspection sessions + chat messages across every phase (idempotent).
-- Drives the agent-side escrow-gated chat for testing (PRD §6.5).
do $$
declare
  test_email text := 'belloolamilekan661@gmail.com';
  uid uuid;
  lekki uuid;
  yaba uuid;
  duplex uuid;
  s_locked uuid;       -- scheduled, NOT paid (chat locked)
  s_paid uuid;         -- escrow_held (chat unlocked)
  s_resched uuid;      -- reschedule_pending (chat unlocked)
  s_progress uuid;     -- in_progress (code confirmed, countdown)
  s_done uuid;         -- completed (escrow released)
  s_disputed uuid;     -- disputed (inspection failed)
  m_renter uuid;       -- for a reply_to demo
begin
  select id into uid from public.users where email = test_email limit 1;
  if uid is null then raise notice 'Seed skipped: no user %', test_email; return; end if;

  select id into lekki from public.listings where posted_by = uid and title = 'Mock: 2 Bedroom Flat in Lekki' limit 1;
  select id into yaba from public.listings where posted_by = uid and title = 'Mock: Self-Contain in Yaba' limit 1;
  select id into duplex from public.listings where posted_by = uid and title = 'Mock: 4 Bedroom Duplex for Sale' limit 1;
  if lekki is null then raise notice 'Seed skipped: listings missing'; return; end if;

  if exists (select 1 from public.inspection_sessions where agent_id = uid) then
    raise notice 'Seed skipped: inspection sessions already exist for %', uid;
    return;
  end if;

  -- 1) scheduled, NOT paid → chat locked
  insert into public.inspection_sessions
    (listing_id, agent_id, renter_name, inspection_fee, scheduled_date, status, chat_unlocked, created_at)
  values (lekki, uid, 'Chioma Okeke', 5000, current_date + 3, 'scheduled', false, now() - interval '2 hours')
  returning id into s_locked;

  -- 2) escrow_held → chat unlocked (the main testable thread)
  insert into public.inspection_sessions
    (listing_id, agent_id, renter_name, inspection_fee, inspection_code, scheduled_date, status, chat_unlocked, created_at)
  values (lekki, uid, 'Aisha Mohammed', 5000, '482913', current_date + 4, 'escrow_held', true, now() - interval '3 days')
  returning id into s_paid;

  insert into public.messages (session_id, sender_role, sender_id, type, body, created_at, read_at) values
    (s_paid, 'system', null, 'system', 'Inspection fee paid and held in escrow. You can now chat.', now() - interval '3 days', now() - interval '3 days'),
    (s_paid, 'renter', null, 'text', 'Hi! Thanks for scheduling. Is the apartment on the ground floor?', now() - interval '3 days' + interval '5 min', now() - interval '2 days');
  insert into public.messages (session_id, sender_role, sender_id, type, body, created_at, read_at)
    values (s_paid, 'renter', null, 'text', 'Also, is parking available?', now() - interval '3 days' + interval '6 min', now() - interval '2 days')
    returning id into m_renter;
  insert into public.messages (session_id, sender_role, sender_id, type, body, reply_to, created_at, read_at) values
    (s_paid, 'agent', uid, 'text', 'Yes, there are 2 dedicated parking spaces.', m_renter, now() - interval '2 days', now() - interval '2 days'),
    (s_paid, 'agent', uid, 'text', 'It''s on the 2nd floor with an elevator. See you on inspection day!', null, now() - interval '2 days' + interval '1 min', null);

  -- 3) reschedule_pending → chat unlocked, renter proposed a new date
  insert into public.inspection_sessions
    (listing_id, agent_id, renter_name, inspection_fee, inspection_code, scheduled_date, status, proposed_date, proposed_by, chat_unlocked, created_at)
  values (duplex, uid, 'Ibrahim Sani', 10000, '601248', current_date + 1, 'reschedule_pending', current_date + 5, 'renter', true, now() - interval '5 days')
  returning id into s_resched;
  insert into public.messages (session_id, sender_role, sender_id, type, body, created_at, read_at) values
    (s_resched, 'system', null, 'system', 'Inspection fee paid and held in escrow. You can now chat.', now() - interval '5 days', now() - interval '5 days'),
    (s_resched, 'renter', null, 'text', 'Something came up — could we move the inspection a few days later?', now() - interval '1 day', null),
    (s_resched, 'system', null, 'system', 'Renter proposed a new inspection date. Review to accept or counter.', now() - interval '1 day', null);

  -- 4) in_progress → code confirmed, 8h escrow countdown running
  insert into public.inspection_sessions
    (listing_id, agent_id, renter_name, inspection_fee, inspection_code, scheduled_date, status, chat_unlocked, code_confirmed_at, escrow_release_at, created_at)
  values (yaba, uid, 'Blessing Adeyemi', 4000, '730145', current_date, 'in_progress', true, now() - interval '1 hour', now() + interval '7 hours', now() - interval '4 days')
  returning id into s_progress;
  insert into public.messages (session_id, sender_role, sender_id, type, body, created_at, read_at) values
    (s_progress, 'system', null, 'system', 'Inspection fee paid and held in escrow. You can now chat.', now() - interval '4 days', now() - interval '4 days'),
    (s_progress, 'renter', null, 'text', 'I''m outside the gate now.', now() - interval '70 min', now() - interval '65 min'),
    (s_progress, 'agent', uid, 'text', 'Great, coming to let you in.', now() - interval '68 min', null),
    (s_progress, 'system', null, 'system', 'Inspection code confirmed. Escrow releases automatically in 8 hours unless a dispute is raised.', now() - interval '1 hour', null);

  -- 5) completed → escrow released to agent
  insert into public.inspection_sessions
    (listing_id, agent_id, renter_name, inspection_fee, inspection_code, scheduled_date, status, chat_unlocked, code_confirmed_at, escrow_release_at, created_at)
  values (yaba, uid, 'David Okon', 4000, '118822', current_date - 10, 'completed', true, now() - interval '11 days', now() - interval '11 days' + interval '8 hours', now() - interval '12 days')
  returning id into s_done;
  insert into public.messages (session_id, sender_role, sender_id, type, body, created_at, read_at) values
    (s_done, 'system', null, 'system', 'Inspection fee paid and held in escrow. You can now chat.', now() - interval '12 days', now() - interval '12 days'),
    (s_done, 'renter', null, 'text', 'Inspection went well, thank you!', now() - interval '11 days', now() - interval '11 days'),
    (s_done, 'system', null, 'system', 'Inspection completed. Escrow released to you.', now() - interval '11 days' + interval '8 hours', now() - interval '11 days' + interval '8 hours');

  -- 6) disputed → inspection failed, under review
  insert into public.inspection_sessions
    (listing_id, agent_id, renter_name, inspection_fee, inspection_code, scheduled_date, status, chat_unlocked, code_confirmed_at, created_at)
  values (lekki, uid, 'Funke Williams', 5000, '905513', current_date - 2, 'disputed', true, now() - interval '2 days', now() - interval '6 days')
  returning id into s_disputed;
  insert into public.messages (session_id, sender_role, sender_id, type, body, created_at, read_at) values
    (s_disputed, 'system', null, 'system', 'Inspection fee paid and held in escrow. You can now chat.', now() - interval '6 days', now() - interval '6 days'),
    (s_disputed, 'renter', null, 'text', 'The apartment did not match the photos.', now() - interval '2 days', now() - interval '2 days'),
    (s_disputed, 'system', null, 'system', 'A dispute has been raised. Submit evidence — an admin will review within 48 hours.', now() - interval '2 days', null);

  raise notice 'Seed done: 6 inspection sessions + chat messages for %', uid;
end $$;
