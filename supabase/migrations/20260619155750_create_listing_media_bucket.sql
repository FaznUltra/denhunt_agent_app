-- Public bucket for listing photos/videos. Path: {userId}/{listingId}/...
insert into storage.buckets (id, name, public)
values ('listing-media', 'listing-media', true)
on conflict (id) do nothing;

-- Owners manage only their own {uid}/... folder; anyone can read (public).
create policy "listing_media_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "listing_media_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'listing-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "listing_media_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "listing_media_read_all" on storage.objects
  for select using (bucket_id = 'listing-media');
