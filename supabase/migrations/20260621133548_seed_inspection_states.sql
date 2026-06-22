-- Seed inspection sessions covering every escrow/dispute state the agent UI
-- needs (idempotent). Adapted to the real schema (no conversations table;
-- messages.session_id; statuses scheduled/escrow_held/in_progress/completed/
-- disputed/refunded). See PRD §14 + §6.5.
do $$
declare
  uid uuid;
  lekki uuid;
  yaba uuid;
  duplex uuid;
  s_code uuid;      -- escrow_held, today, code not confirmed (STATE 2B)
  s_progress uuid;  -- in_progress, 3h elapsed / 5h remaining
  s_done uuid;      -- completed (escrow released)
  s_disputed uuid;  -- disputed, agent must respond
  s_refunded uuid;  -- resolved agent fault (refunded)
  s_paid uuid;      -- resolved renter fault (completed/paid)
  d_amara uuid;
begin
  select id into uid from public.users where email = 'belloolamilekan661@gmail.com' limit 1;
  if uid is null then raise notice 'Seed skipped: no test user'; return; end if;

  select id into lekki from public.listings where posted_by = uid and title = 'Mock: 2 Bedroom Flat in Lekki' limit 1;
  select id into yaba from public.listings where posted_by = uid and title = 'Mock: Self-Contain in Yaba' limit 1;
  select id into duplex from public.listings where posted_by = uid and title = 'Mock: 4 Bedroom Duplex for Sale' limit 1;
  if lekki is null then raise notice 'Seed skipped: listings missing'; return; end if;

  if exists (select 1 from public.inspection_sessions where agent_id = uid and renter_name = 'Fatima Bello') then
    raise notice 'Seed skipped: inspection-state sessions already exist';
    return;
  end if;

  -- 1) escrow_held, today → agent needs to enter renter's code
  insert into public.inspection_sessions
    (listing_id, agent_id, renter_name, inspection_fee, inspection_code, scheduled_date, scheduled_time, status, chat_unlocked, paystack_reference, created_at)
  values (lekki, uid, 'Fatima Bello', 8000, '472819', current_date, '10:00 AM', 'escrow_held', true, 'TEST_REF_FATIMA_001', now() - interval '2 hours')
  returning id into s_code;
  insert into public.messages (session_id, sender_role, type, body, metadata, created_at, read_at) values
    (s_code, 'system', 'system', 'Inspection fee paid and held in escrow. You can now chat.', '{"type":"payment_received","amount":8000}'::jsonb, now() - interval '2 hours', now() - interval '2 hours'),
    (s_code, 'renter', 'text', 'Hello! I am on my way to the property now.', null, now() - interval '30 minutes', null),
    (s_code, 'agent', 'text', 'Great! I am already here. Ask security for Block B.', null, now() - interval '25 minutes', null),
    (s_code, 'renter', 'text', 'I am outside now. Should I share the code?', null, now() - interval '5 minutes', null);

  -- 2) in_progress, 3h elapsed / 5h remaining
  insert into public.inspection_sessions
    (listing_id, agent_id, renter_name, inspection_fee, inspection_code, scheduled_date, scheduled_time, status, chat_unlocked, paystack_reference, code_confirmed_at, escrow_release_at, created_at)
  values (yaba, uid, 'Chukwuemeka Obi', 12000, '983641', current_date, '9:00 AM', 'in_progress', true, 'TEST_REF_EMEKA_002', now() - interval '3 hours', now() + interval '5 hours', now() - interval '3 hours' - interval '1 hour')
  returning id into s_progress;
  insert into public.messages (session_id, sender_role, type, body, metadata, created_at, read_at) values
    (s_progress, 'system', 'system', 'Inspection started. Escrow releases automatically in 8 hours.', ('{"type":"inspection_started","release_at":"' || (now() + interval '5 hours')::text || '"}')::jsonb, now() - interval '3 hours', now() - interval '3 hours'),
    (s_progress, 'renter', 'text', 'The property looks exactly as advertised. Very clean.', null, now() - interval '2 hours 30 minutes', now() - interval '2 hours'),
    (s_progress, 'agent', 'text', 'Glad you like it! Water runs 24/7 and power has been stable.', null, now() - interval '2 hours 25 minutes', null);

  -- 3) completed (escrow released)
  insert into public.inspection_sessions
    (listing_id, agent_id, renter_name, inspection_fee, inspection_code, scheduled_date, scheduled_time, status, chat_unlocked, paystack_reference, code_confirmed_at, escrow_release_at, created_at)
  values (duplex, uid, 'Ngozi Adeyemi', 5000, '156234', current_date - interval '2 days', '2:00 PM', 'completed', true, 'TEST_REF_NGOZI_003', now() - interval '2 days 2 hours', now() - interval '1 day 18 hours', now() - interval '2 days 3 hours')
  returning id into s_done;
  insert into public.messages (session_id, sender_role, type, body, metadata, created_at, read_at) values
    (s_done, 'renter', 'text', 'Inspection went well, thank you!', null, now() - interval '2 days', now() - interval '2 days'),
    (s_done, 'system', 'system', 'Inspection completed. Escrow released to you.', '{"type":"escrow_released","amount":5000}'::jsonb, now() - interval '1 day 18 hours', now() - interval '1 day 18 hours');

  -- 4) disputed → agent must respond (with GPS + renter evidence)
  insert into public.inspection_sessions
    (listing_id, agent_id, renter_name, inspection_fee, inspection_code, scheduled_date, scheduled_time, status, chat_unlocked, paystack_reference, code_confirmed_at, escrow_release_at, renter_gps_lat, renter_gps_lng, agent_gps_lat, agent_gps_lng, gps_proximity_metres, created_at)
  values (lekki, uid, 'Amara Okafor', 15000, '731924', current_date, '11:00 AM', 'disputed', true, 'TEST_REF_AMARA_004', now() - interval '2 hours', now() + interval '6 hours', 6.4281, 3.4219, 6.4275, 3.4223, 87.3, now() - interval '3 hours')
  returning id into s_disputed;
  insert into public.disputes (session_id, raised_by, reason, description, status, created_at)
  values (s_disputed, null, 'Property does not match listing photos/video',
          'The apartment shown is different from what was advertised. The photos showed a renovated kitchen but the actual property has an old kitchen with broken fittings.',
          'open', now() - interval '1 hour')
  returning id into d_amara;
  insert into public.inspection_evidence (session_id, submitted_by, type, url, uploaded_at) values
    (s_disputed, 'renter', 'photo', 'https://picsum.photos/seed/dispute1/800/600', now() - interval '1 hour'),
    (s_disputed, 'renter', 'photo', 'https://picsum.photos/seed/dispute2/800/600', now() - interval '1 hour');
  insert into public.messages (session_id, sender_role, type, body, metadata, created_at) values
    (s_disputed, 'system', 'system', 'Inspection started.', '{"type":"inspection_started"}'::jsonb, now() - interval '2 hours'),
    (s_disputed, 'renter', 'text', 'This is not the apartment in the photos.', null, now() - interval '1 hour 10 minutes'),
    (s_disputed, 'system', 'system', 'A dispute has been raised. Submit evidence — an admin will review within 48 hours.', '{"type":"dispute_raised","reason":"Property does not match listing photos/video"}'::jsonb, now() - interval '1 hour');

  -- 5) refunded (resolved agent fault)
  insert into public.inspection_sessions
    (listing_id, agent_id, renter_name, inspection_fee, status, chat_unlocked, paystack_reference, code_confirmed_at, created_at)
  values (yaba, uid, 'Yusuf Musa', 10000, 'refunded', true, 'TEST_REF_YUSUF_005', now() - interval '5 days', now() - interval '6 days')
  returning id into s_refunded;
  insert into public.messages (session_id, sender_role, type, body, metadata, created_at) values
    (s_refunded, 'system', 'system', 'Dispute resolved · Renter refunded ₦10,000.', '{"type":"dispute_resolved","verdict":"agent_fault","amount":10000}'::jsonb, now() - interval '4 days');

  -- 6) completed (resolved renter fault — paid to agent)
  insert into public.inspection_sessions
    (listing_id, agent_id, renter_name, inspection_fee, status, chat_unlocked, paystack_reference, code_confirmed_at, created_at)
  values (duplex, uid, 'Blessing Eze', 7500, 'completed', true, 'TEST_REF_BLESSING_006', now() - interval '3 days', now() - interval '4 days')
  returning id into s_paid;
  insert into public.messages (session_id, sender_role, type, body, metadata, created_at) values
    (s_paid, 'system', 'system', 'Dispute resolved in your favour · ₦7,500 released to you.', '{"type":"dispute_resolved","verdict":"renter_fault","amount":7500}'::jsonb, now() - interval '3 days');

  raise notice 'Seed done: 6 inspection-state sessions for %', uid;
end $$;
