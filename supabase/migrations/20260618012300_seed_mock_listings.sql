-- Seed mock listings for a test user (idempotent). Safe on any environment:
-- skips if the user doesn't exist or mock listings already exist.
do $$
declare
  test_email text := 'belloolamilekan661@gmail.com';
  uid uuid;
begin
  select id into uid from public.users where email = test_email limit 1;

  if uid is null then
    raise notice 'Seed skipped: no public.users row for %', test_email;
    return;
  end if;

  if exists (select 1 from public.listings where posted_by = uid and title like 'Mock:%') then
    raise notice 'Seed skipped: mock listings already exist for user %', uid;
    return;
  end if;

  insert into public.listings
    (posted_by, title, description, category, purpose, bedrooms, bathrooms, toilets,
     furnishing, amenities, state, lga, area, price, payment_frequency, status,
     available_from, occupancy_status, views_count, enquiries_count)
  values
    (uid, 'Mock: 2 Bedroom Flat in Lekki',
     'Spacious 2-bedroom apartment with modern finishing, 24/7 power and secure estate.',
     'apartment', 'rent', 2, 2, 3, 'semi',
     array['Parking','Borehole water','Security','Prepaid meter'],
     'Lagos', 'Eti-Osa', 'Lekki Phase 1', 2500000, 'per_annum', 'active',
     current_date, 'vacant', 42, 5),
    (uid, 'Mock: Self-Contain in Yaba',
     'Neat self-contained apartment, close to UNILAG and major bus stops.',
     'self_con', 'rent', 1, 1, 1, 'unfurnished',
     array['Prepaid meter','Water','Tiled floor'],
     'Lagos', 'Yaba', 'Sabo', 450000, 'per_annum', 'pending_review',
     current_date, 'vacant', 10, 1),
    (uid, 'Mock: 4 Bedroom Duplex for Sale',
     'Luxury 4-bedroom detached duplex with BQ, fitted kitchen and ample parking.',
     'duplex', 'sale', 4, 5, 5, 'furnished',
     array['BQ','Parking','Security','POP ceiling','Fitted kitchen'],
     'Lagos', 'Ikeja', 'GRA', 180000000, 'outright', 'draft',
     current_date, 'vacant', 0, 0);

  -- Cover photos (order_index = 0) so the cards render real images.
  insert into public.listing_media (listing_id, type, url, order_index)
  select id, 'photo',
         'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', 0
  from public.listings where posted_by = uid and title = 'Mock: 2 Bedroom Flat in Lekki';

  insert into public.listing_media (listing_id, type, url, order_index)
  select id, 'photo',
         'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 0
  from public.listings where posted_by = uid and title = 'Mock: Self-Contain in Yaba';

  insert into public.listing_media (listing_id, type, url, order_index)
  select id, 'photo',
         'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', 0
  from public.listings where posted_by = uid and title = 'Mock: 4 Bedroom Duplex for Sale';

  raise notice 'Seed done: created 3 mock listings for user %', uid;
end $$;
