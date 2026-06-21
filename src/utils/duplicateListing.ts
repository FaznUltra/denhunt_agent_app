import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type ListingInsert = Database['public']['Tables']['listings']['Insert'];
type MediaInsert = Database['public']['Tables']['listing_media']['Insert'];

// Duplicate a listing (and its media) as a fresh draft owned by userId.
// Returns the new listing id. Shared by the listings index, detail, and
// "relist" actions.
export async function duplicateListing(
  listingId: string,
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<string> {
  const { data: original, error: fetchErr } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single();
  if (fetchErr || !original) throw new Error(fetchErr?.message ?? 'Listing not found');

  const copy: Record<string, unknown> = { ...original };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  delete copy.expires_at;
  copy.posted_by = userId;
  copy.status = 'draft';
  copy.views_count = 0;
  copy.enquiries_count = 0;

  const { data: created, error: insertErr } = await supabase
    .from('listings')
    .insert(copy as unknown as ListingInsert)
    .select('id')
    .single();
  if (insertErr || !created) throw new Error(insertErr?.message ?? 'Could not duplicate listing');

  const { data: media } = await supabase
    .from('listing_media')
    .select('type, url, order_index')
    .eq('listing_id', listingId);

  if (media && media.length > 0) {
    const rows: MediaInsert[] = media.map((m) => ({
      listing_id: created.id,
      type: m.type,
      url: m.url,
      order_index: m.order_index,
    }));
    await supabase.from('listing_media').insert(rows);
  }

  return created.id;
}
