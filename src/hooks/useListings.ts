import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { Listing, ListingStatus } from '@/types/listings';

export type ListingFilter = ListingStatus | 'all';
export type SortOrder =
  | 'newest'
  | 'oldest'
  | 'most_enquiries'
  | 'most_views'
  | 'price_high'
  | 'price_low';

export type ListingCounts = {
  all: number;
  active: number;
  pending_review: number;
  draft: number;
  paused: number;
  rented_sold: number;
};

export type UseListings = {
  listings: Listing[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  counts: ListingCounts;
  isAgencyAdmin: boolean;
};

const SELECT =
  'id, title, price, payment_frequency, status, category, purpose, bedrooms, bathrooms, area, state, enquiries_count, views_count, created_at, updated_at, expires_at, rejection_reason, agency_id, posted_by';

type RawListing = {
  id: string;
  title: string;
  price: number;
  payment_frequency: string | null;
  status: string;
  category: string | null;
  purpose: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: string | null;
  state: string | null;
  enquiries_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  rejection_reason: string | null;
  agency_id: string | null;
  posted_by: string;
};

type Scope = { kind: 'user' | 'agency' | 'none'; id: string };

const EMPTY_COUNTS: ListingCounts = {
  all: 0,
  active: 0,
  pending_review: 0,
  draft: 0,
  paused: 0,
  rented_sold: 0,
};

// Resolve whose listings to show: own (agent) or the whole agency (admin).
async function resolveScope(): Promise<Scope> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: 'none', id: '' };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'agency_admin') {
    const { data: agency } = await supabase
      .from('agencies')
      .select('id')
      .eq('admin_id', user.id)
      .maybeSingle();
    return agency?.id ? { kind: 'agency', id: agency.id } : { kind: 'none', id: '' };
  }
  return { kind: 'user', id: user.id };
}

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

function sortListings(rows: Listing[], order: SortOrder): Listing[] {
  const copy = [...rows];
  switch (order) {
    case 'oldest':
      return copy.sort((a, b) => a.created_at.localeCompare(b.created_at));
    case 'most_enquiries':
      return copy.sort((a, b) => b.enquiries_count - a.enquiries_count);
    case 'most_views':
      return copy.sort((a, b) => b.views_count - a.views_count);
    case 'price_high':
      return copy.sort((a, b) => b.price - a.price);
    case 'price_low':
      return copy.sort((a, b) => a.price - b.price);
    case 'newest':
    default:
      return copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

// Role-aware listings for the Listings tab. Filtering + sorting happen
// client-side off a single fetch so switching filters is instant and counts
// stay accurate across all statuses. Refetches on tab focus.
export function useListings(activeFilter: ListingFilter, sortOrder: SortOrder): UseListings {
  const [all, setAll] = useState<Listing[]>([]);
  const [isAgencyAdmin, setIsAgencyAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const scope = await resolveScope();
      if (scope.kind === 'none') {
        setAll([]);
        setIsAgencyAdmin(false);
        return;
      }
      setIsAgencyAdmin(scope.kind === 'agency');

      const query = supabase.from('listings').select(SELECT).order('created_at', { ascending: false });
      const { data, error: queryErr } =
        scope.kind === 'agency'
          ? await query.eq('agency_id', scope.id)
          : await query.eq('posted_by', scope.id);
      if (queryErr) throw new Error(queryErr.message);

      const rows = (data ?? []) as RawListing[];
      const covers = await fetchCovers(rows.map((r) => r.id));

      const names: Record<string, string> = {};
      if (scope.kind === 'agency') {
        const posterIds = [...new Set(rows.map((r) => r.posted_by))];
        if (posterIds.length) {
          const { data: users } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', posterIds);
          for (const u of users ?? []) names[u.id] = u.full_name;
        }
      }

      const mapped: Listing[] = rows.map((r) => ({
        id: r.id,
        title: r.title,
        price: Number(r.price ?? 0),
        payment_frequency: r.payment_frequency ?? 'outright',
        status: r.status as ListingStatus,
        category: r.category ?? '',
        purpose: r.purpose ?? '',
        bedrooms: r.bedrooms,
        bathrooms: r.bathrooms,
        area: r.area,
        state: r.state,
        enquiries_count: r.enquiries_count ?? 0,
        views_count: r.views_count ?? 0,
        created_at: r.created_at,
        updated_at: r.updated_at,
        expires_at: r.expires_at,
        rejection_reason: r.rejection_reason,
        agency_id: r.agency_id,
        cover_photo_url: covers[r.id] ?? null,
        posted_by_name: scope.kind === 'agency' ? (names[r.posted_by] ?? null) : null,
      }));

      setAll(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  const counts = useMemo<ListingCounts>(() => {
    const c: ListingCounts = { ...EMPTY_COUNTS, all: all.length };
    for (const l of all) {
      if (l.status === 'active') c.active += 1;
      else if (l.status === 'pending_review') c.pending_review += 1;
      else if (l.status === 'draft') c.draft += 1;
      else if (l.status === 'paused') c.paused += 1;
      else if (l.status === 'rented_sold') c.rented_sold += 1;
    }
    return c;
  }, [all]);

  const listings = useMemo(() => {
    const filtered = activeFilter === 'all' ? all : all.filter((l) => l.status === activeFilter);
    return sortListings(filtered, sortOrder);
  }, [all, activeFilter, sortOrder]);

  return { listings, loading, error, refetch: fetchAll, counts, isAgencyAdmin };
}
