-- Seed varied mock enquiries for the test user's listings (idempotent).
-- Covers every status + combinations of message / email / preferred date.
do $$
declare
  test_email text := 'belloolamilekan661@gmail.com';
  uid uuid;
  lekki uuid;
  yaba uuid;
  duplex uuid;
begin
  select id into uid from public.users where email = test_email limit 1;
  if uid is null then
    raise notice 'Seed skipped: no public.users row for %', test_email;
    return;
  end if;

  select id into lekki from public.listings
    where posted_by = uid and title = 'Mock: 2 Bedroom Flat in Lekki' limit 1;
  select id into yaba from public.listings
    where posted_by = uid and title = 'Mock: Self-Contain in Yaba' limit 1;
  select id into duplex from public.listings
    where posted_by = uid and title = 'Mock: 4 Bedroom Duplex for Sale' limit 1;

  if lekki is null then
    raise notice 'Seed skipped: mock listings not found for %', uid;
    return;
  end if;

  if exists (
    select 1 from public.enquiries e
    join public.listings l on l.id = e.listing_id
    where l.posted_by = uid
  ) then
    raise notice 'Seed skipped: enquiries already exist for %', uid;
    return;
  end if;

  insert into public.enquiries
    (listing_id, agent_id, enquirer_name, enquirer_phone, enquirer_email, message,
     preferred_inspection_date, status, created_at)
  values
    -- new: full details (message + email + preferred date)
    (lekki, uid, 'Chioma Okeke', '08031234567', 'chioma.okeke@gmail.com',
     'Hi, is this still available? I''d love to inspect this weekend.',
     current_date + 3, 'new', now() - interval '2 hours'),
    -- new: message only, no email, no date
    (lekki, uid, 'Tunde Bakare', '07061234567', null,
     'Please can I get more photos of the kitchen and bathroom?',
     null, 'new', now() - interval '1 day'),
    -- new: bare (no message, no email, no date)
    (yaba, uid, 'Emeka Nwosu', '08090001111', null,
     null, null, 'new', now() - interval '5 hours'),
    -- contacted: with email + preferred date
    (lekki, uid, 'Aisha Mohammed', '09011112222', 'aisha.m@yahoo.com',
     'Is the price negotiable? Looking to move in early March.',
     current_date + 7, 'contacted', now() - interval '3 days'),
    -- contacted: sale enquiry, no date
    (duplex, uid, 'Ibrahim Sani', '07099998888', 'ibrahim.sani@gmail.com',
     'Interested in buying. Can we discuss a payment plan?',
     null, 'contacted', now() - interval '6 days'),
    -- inspection_scheduled
    (yaba, uid, 'Blessing Adeyemi', '08123334444', 'blessing@outlook.com',
     'We agreed on Saturday for the inspection. Thank you!',
     current_date + 2, 'inspection_scheduled', now() - interval '4 days'),
    -- not_interested
    (lekki, uid, 'Funke Williams', '08055556666', null,
     'Found another place already, thanks for your time.',
     null, 'not_interested', now() - interval '8 days'),
    -- closed
    (yaba, uid, 'David Okon', '08077778888', 'david.okon@gmail.com',
     'Deal done — moved in last week. Great service!',
     null, 'closed', now() - interval '12 days');

  -- Keep each listing's enquiries_count in sync with the seeded rows.
  update public.listings l
    set enquiries_count = (select count(*) from public.enquiries e where e.listing_id = l.id)
    where l.posted_by = uid;

  raise notice 'Seed done: created 8 mock enquiries for user %', uid;
end $$;
