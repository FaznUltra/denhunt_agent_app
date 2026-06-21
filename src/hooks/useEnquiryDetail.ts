import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { Enquiry as DbEnquiry } from '@/types/database';
import type { Enquiry, EnquiryStatus } from '@/types/enquiries';
import type { ListingDetailLight, ListingStatus } from '@/types/listings';

export type UseEnquiryDetail = {
  enquiry: Enquiry | null;
  listing: ListingDetailLight | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

// Single enquiry + the listing it's about. RLS scopes access (own enquiry, or
// agency admin's listings); an inaccessible id returns null.
export function useEnquiryDetail(id: string): UseEnquiryDetail {
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [listing, setListing] = useState<ListingDetailLight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      setError('Missing enquiry id');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: row, error: enqErr } = await supabase
        .from('enquiries')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (enqErr) throw new Error(enqErr.message);
      if (!row) {
        setEnquiry(null);
        setListing(null);
        return;
      }
      const e = row as DbEnquiry;

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      const admin = profile?.role === 'agency_admin';

      const { data: l } = await supabase
        .from('listings')
        .select(
          'id, title, price, payment_frequency, status, bedrooms, bathrooms, area, state, category, inspection_fee, posted_by',
        )
        .eq('id', e.listing_id)
        .maybeSingle();

      let coverUrl: string | null = null;
      let agentName: string | null = null;
      if (l) {
        const { data: media } = await supabase
          .from('listing_media')
          .select('url, order_index')
          .eq('listing_id', l.id)
          .eq('order_index', 0)
          .maybeSingle();
        coverUrl = media?.url ?? null;
        if (admin && l.posted_by) {
          const { data: poster } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', l.posted_by)
            .maybeSingle();
          agentName = poster?.full_name ?? null;
        }
      }

      setEnquiry({
        id: e.id,
        listing_id: e.listing_id,
        agent_id: e.agent_id,
        enquirer_name: e.enquirer_name,
        enquirer_phone: e.enquirer_phone,
        enquirer_email: e.enquirer_email,
        message: e.message,
        preferred_inspection_date: e.preferred_inspection_date,
        status: e.status as EnquiryStatus,
        created_at: e.created_at,
        listing_title: l?.title ?? null,
        listing_price: l?.price ?? null,
        listing_payment_frequency: l?.payment_frequency ?? null,
        listing_area: l?.area ?? null,
        listing_state: l?.state ?? null,
        listing_cover_photo: coverUrl,
        listing_agent_name: agentName,
      });

      setListing(
        l
          ? {
              id: l.id,
              title: l.title,
              price: Number(l.price ?? 0),
              payment_frequency: l.payment_frequency ?? 'outright',
              status: l.status as ListingStatus,
              bedrooms: l.bedrooms,
              bathrooms: l.bathrooms,
              area: l.area,
              state: l.state,
              category: l.category ?? '',
              inspection_fee: l.inspection_fee,
              cover_photo_url: coverUrl,
            }
          : null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load enquiry');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail]),
  );

  return { enquiry, listing, loading, error, refetch: fetchDetail };
}
