import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type {
  EnquiryPreview,
  ListingDetail,
  ListingMedia,
  ListingStatus,
} from '@/types/listings';

export type UseListingDetail = {
  listing: ListingDetail | null;
  media: ListingMedia[];
  recentEnquiries: EnquiryPreview[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

// Single listing with its media + recent enquiries. Access is enforced by
// RLS (owner agent or agency admin) — an inaccessible id simply returns null.
export function useListingDetail(id: string): UseListingDetail {
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [media, setMedia] = useState<ListingMedia[]>([]);
  const [recentEnquiries, setRecentEnquiries] = useState<EnquiryPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      setError('Missing listing id');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: row, error: listErr } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (listErr) throw new Error(listErr.message);

      if (!row) {
        setListing(null);
        setMedia([]);
        setRecentEnquiries([]);
        return;
      }

      const detail: ListingDetail = {
        id: row.id,
        title: row.title,
        price: Number(row.price ?? 0),
        payment_frequency: row.payment_frequency ?? 'outright',
        status: row.status as ListingStatus,
        category: row.category ?? '',
        purpose: row.purpose ?? '',
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        area: row.area,
        state: row.state,
        enquiries_count: row.enquiries_count ?? 0,
        views_count: row.views_count ?? 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
        expires_at: row.expires_at,
        rejection_reason: row.rejection_reason,
        agency_id: row.agency_id,
        cover_photo_url: null,
        posted_by_name: null,
        description: row.description,
        furnishing: row.furnishing,
        floor: row.floor,
        size_sqm: row.size_sqm,
        year_built: row.year_built,
        parking: row.parking,
        land_size: row.land_size,
        amenities: row.amenities ?? [],
        street_address: row.street_address,
        show_exact_address: row.show_exact_address ?? false,
        latitude: row.latitude,
        longitude: row.longitude,
        caution_fee: row.caution_fee,
        agency_fee: row.agency_fee,
        service_charge: row.service_charge,
        price_negotiable: row.price_negotiable ?? false,
        available_from: row.available_from,
        available_until: row.available_until,
        occupancy_status: row.occupancy_status,
        inspection_fee: row.inspection_fee,
        posted_by: row.posted_by,
      };
      setListing(detail);

      const { data: mediaRows } = await supabase
        .from('listing_media')
        .select('id, url, type, order_index')
        .eq('listing_id', id)
        .order('order_index', { ascending: true });
      setMedia(
        (mediaRows ?? []).map((m) => ({
          id: m.id,
          url: m.url,
          type: m.type as 'photo' | 'video',
          order_index: m.order_index,
        })),
      );

      const { data: enquiryRows } = await supabase
        .from('enquiries')
        .select('id, enquirer_name, enquirer_phone, message, preferred_inspection_date, status, created_at')
        .eq('listing_id', id)
        .order('created_at', { ascending: false })
        .limit(3);
      setRecentEnquiries(
        (enquiryRows ?? []).map((e) => ({
          id: e.id,
          enquirer_name: e.enquirer_name,
          enquirer_phone: e.enquirer_phone,
          message: e.message,
          preferred_inspection_date: e.preferred_inspection_date,
          status: e.status,
          created_at: e.created_at,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail]),
  );

  return { listing, media, recentEnquiries, loading, error, refetch: fetchDetail };
}
