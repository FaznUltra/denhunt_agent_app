import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { Enquiry as DbEnquiry } from '@/types/database';
import type { Enquiry, EnquiryStatus } from '@/types/enquiries';

export type EnquiryFilter = EnquiryStatus | 'all';

export type EnquiryCounts = {
  all: number;
  new: number;
  contacted: number;
  inspection_scheduled: number;
  closed: number;
  not_interested: number;
};

export type UseEnquiries = {
  enquiries: Enquiry[];
  loading: boolean;
  error: string | null;
  counts: EnquiryCounts;
  refetch: () => Promise<void>;
  isAgencyAdmin: boolean;
};

const EMPTY_COUNTS: EnquiryCounts = {
  all: 0,
  new: 0,
  contacted: 0,
  inspection_scheduled: 0,
  closed: 0,
  not_interested: 0,
};

type ListingLite = {
  id: string;
  title: string | null;
  price: number | null;
  payment_frequency: string | null;
  area: string | null;
  state: string | null;
  posted_by: string;
};

async function fetchCovers(listingIds: string[]): Promise<Record<string, string>> {
  if (listingIds.length === 0) return {};
  const { data } = await supabase
    .from('listing_media')
    .select('listing_id, url, order_index')
    .in('listing_id', listingIds)
    .eq('order_index', 0);
  const map: Record<string, string> = {};
  for (const m of data ?? []) {
    if (m.listing_id && m.url) map[m.listing_id] = m.url;
  }
  return map;
}

// Role-aware enquiries inbox. RLS scopes rows to the agent's own enquiries, or
// (for agency_admin) to all enquiries on the agency's listings. Filtering,
// sorting, and search happen client-side off a single fetch.
export function useEnquiries(statusFilter: EnquiryFilter, listingId?: string): UseEnquiries {
  const [all, setAll] = useState<Enquiry[]>([]);
  const [isAgencyAdmin, setIsAgencyAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      const admin = profile?.role === 'agency_admin';
      setIsAgencyAdmin(admin);

      const query = supabase.from('enquiries').select('*').order('created_at', { ascending: false });
      const { data: rows, error: queryErr } = listingId
        ? await query.eq('listing_id', listingId)
        : await query;
      if (queryErr) throw new Error(queryErr.message);
      const enquiryRows = (rows ?? []) as DbEnquiry[];

      const listingIds = [...new Set(enquiryRows.map((r) => r.listing_id))];
      const listingMap: Record<string, ListingLite> = {};
      const posterIds = new Set<string>();
      if (listingIds.length) {
        const { data: listings } = await supabase
          .from('listings')
          .select('id, title, price, payment_frequency, area, state, posted_by')
          .in('id', listingIds);
        for (const l of listings ?? []) {
          listingMap[l.id] = l;
          if (l.posted_by) posterIds.add(l.posted_by);
        }
      }

      const covers = await fetchCovers(listingIds);

      const nameMap: Record<string, string> = {};
      if (admin && posterIds.size) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', [...posterIds]);
        for (const u of users ?? []) nameMap[u.id] = u.full_name;
      }

      const mapped: Enquiry[] = enquiryRows.map((r) => {
        const l = listingMap[r.listing_id];
        return {
          id: r.id,
          listing_id: r.listing_id,
          agent_id: r.agent_id,
          enquirer_name: r.enquirer_name,
          enquirer_phone: r.enquirer_phone,
          enquirer_email: r.enquirer_email,
          message: r.message,
          preferred_inspection_date: r.preferred_inspection_date,
          status: r.status as EnquiryStatus,
          created_at: r.created_at,
          listing_title: l?.title ?? null,
          listing_price: l?.price ?? null,
          listing_payment_frequency: l?.payment_frequency ?? null,
          listing_area: l?.area ?? null,
          listing_state: l?.state ?? null,
          listing_cover_photo: covers[r.listing_id] ?? null,
          listing_agent_name: admin && l?.posted_by ? (nameMap[l.posted_by] ?? null) : null,
        };
      });
      setAll(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  const counts = useMemo<EnquiryCounts>(() => {
    const c: EnquiryCounts = { ...EMPTY_COUNTS, all: all.length };
    for (const e of all) {
      c[e.status] += 1;
    }
    return c;
  }, [all]);

  const enquiries = useMemo(() => {
    const filtered = statusFilter === 'all' ? all : all.filter((e) => e.status === statusFilter);
    // New enquiries float to the top, then newest first.
    return [...filtered].sort((a, b) => {
      const rank = (a.status === 'new' ? 0 : 1) - (b.status === 'new' ? 0 : 1);
      return rank !== 0 ? rank : b.created_at.localeCompare(a.created_at);
    });
  }, [all, statusFilter]);

  return { enquiries, loading, error, counts, refetch: fetchAll, isAgencyAdmin };
}
