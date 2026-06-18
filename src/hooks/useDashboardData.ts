import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { UserRole, VerificationStatus, UserStatus } from '@/types/database';

// ---- Return types (all explicit, no any) ----
export type DashboardUser = {
  id: string;
  full_name: string;
  role: UserRole;
  profile_photo_url: string | null;
  verification_status: VerificationStatus;
  status: UserStatus;
};

export type RecentListing = {
  id: string;
  title: string;
  price: number;
  payment_frequency: string;
  status: string;
  bedrooms: number;
  bathrooms: number;
  area: string;
  state: string;
  enquiries_count: number;
  views_count: number;
  created_at: string;
  cover_photo_url: string | null;
  agent_name: string | null;
};

export type ListingCounts = {
  active: number;
  pending_review: number;
  paused: number;
  draft: number;
};

export type DashboardAgency = {
  id: string;
  name: string;
  logo_url: string | null;
  verification_status: string;
  subscription_plan: string | null;
};

export type AgencyStats = {
  total_active_listings: number;
  total_enquiries_month: number;
  total_agents: number;
  pending_listings: number;
};

export type AgencyMemberPreview = {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  verification_status: VerificationStatus;
};

type DashboardResult = {
  user: DashboardUser | null;
  role: UserRole | null;
  agency: DashboardAgency | null;
  agencyStats: AgencyStats | null;
  agencyMembers: AgencyMemberPreview[];
  listingCounts: ListingCounts;
  monthlyEnquiries: number;
  recentListings: RecentListing[];
};

export type DashboardData = DashboardResult & {
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

const EMPTY_COUNTS: ListingCounts = { active: 0, pending_review: 0, paused: 0, draft: 0 };

const EMPTY_RESULT: DashboardResult = {
  user: null,
  role: null,
  agency: null,
  agencyStats: null,
  agencyMembers: [],
  listingCounts: EMPTY_COUNTS,
  monthlyEnquiries: 0,
  recentListings: [],
};

// Listing fields the dashboard needs.
const LISTING_FIELDS =
  'id, title, price, payment_frequency, status, bedrooms, bathrooms, area, state, enquiries_count, views_count, created_at';

function startOfMonthISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function countByStatus(rows: { status: string }[]): ListingCounts {
  const counts: ListingCounts = { ...EMPTY_COUNTS };
  for (const row of rows) {
    if (row.status === 'active') counts.active += 1;
    else if (row.status === 'pending_review') counts.pending_review += 1;
    else if (row.status === 'paused') counts.paused += 1;
    else if (row.status === 'draft') counts.draft += 1;
  }
  return counts;
}

// Fetch the cover photo (order_index = 0) for each listing id.
async function fetchCoverPhotos(listingIds: string[]): Promise<Record<string, string>> {
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

type RawListing = {
  id: string;
  title: string;
  price: number;
  payment_frequency: string | null;
  status: string;
  bedrooms: number;
  bathrooms: number;
  area: string | null;
  state: string | null;
  enquiries_count: number;
  views_count: number;
  created_at: string;
  posted_by?: string;
};

function toRecent(
  row: RawListing,
  covers: Record<string, string>,
  agentName: string | null,
): RecentListing {
  return {
    id: row.id,
    title: row.title,
    price: Number(row.price ?? 0),
    payment_frequency: row.payment_frequency ?? 'outright',
    status: row.status,
    bedrooms: row.bedrooms ?? 0,
    bathrooms: row.bathrooms ?? 0,
    area: row.area ?? '',
    state: row.state ?? '',
    enquiries_count: row.enquiries_count ?? 0,
    views_count: row.views_count ?? 0,
    created_at: row.created_at,
    cover_photo_url: covers[row.id] ?? null,
    agent_name: agentName,
  };
}

// Role-aware dashboard data. Refetches whenever the screen regains focus.
export function useDashboardData(): DashboardData {
  const [result, setResult] = useState<DashboardResult>(EMPTY_RESULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('id, full_name, role, profile_photo_url, verification_status, status')
        .eq('id', authUser.id)
        .single();
      if (profileErr || !profile) throw new Error(profileErr?.message ?? 'Profile not found');

      const user: DashboardUser = {
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role,
        profile_photo_url: profile.profile_photo_url,
        verification_status: profile.verification_status,
        status: profile.status,
      };
      const role = profile.role;

      if (role === 'agency_admin') {
        await loadAgencyAdmin(authUser.id, user, role, setResult);
      } else {
        await loadAgentLike(authUser.id, user, role, setResult);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch on tab focus.
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  return { ...result, loading, error, refetch: fetchData };
}

// individual_agent + agency_agent: own listings/enquiries (+ agency banner for agent).
async function loadAgentLike(
  userId: string,
  user: DashboardUser,
  role: UserRole,
  setResult: (r: DashboardResult) => void,
) {
  const { data: rows } = await supabase
    .from('listings')
    .select(LISTING_FIELDS)
    .eq('posted_by', userId)
    .order('created_at', { ascending: false });
  const list = (rows ?? []) as RawListing[];
  const listingCounts = countByStatus(list);
  const recent3 = list.slice(0, 3);
  const covers = await fetchCoverPhotos(recent3.map((r) => r.id));
  const recentListings = recent3.map((r) => toRecent(r, covers, null));

  const { count } = await supabase
    .from('enquiries')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', userId)
    .gte('created_at', startOfMonthISO());

  let agency: DashboardAgency | null = null;
  if (role === 'agency_agent') {
    const { data: member } = await supabase
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (member?.agency_id) {
      const { data: ag } = await supabase
        .from('agencies')
        .select('id, name, logo_url, verification_status, subscription_plan')
        .eq('id', member.agency_id)
        .maybeSingle();
      if (ag) agency = ag;
    }
  }

  setResult({
    user,
    role,
    agency,
    agencyStats: null,
    agencyMembers: [],
    listingCounts,
    monthlyEnquiries: count ?? 0,
    recentListings,
  });
}

// agency_admin: agency-wide listings/enquiries/team.
async function loadAgencyAdmin(
  userId: string,
  user: DashboardUser,
  role: UserRole,
  setResult: (r: DashboardResult) => void,
) {
  const { data: ag } = await supabase
    .from('agencies')
    .select('id, name, logo_url, verification_status, subscription_plan')
    .eq('admin_id', userId)
    .maybeSingle();
  const agency: DashboardAgency | null = ag ?? null;

  if (!agency) {
    setResult({
      user,
      role,
      agency: null,
      agencyStats: { total_active_listings: 0, total_enquiries_month: 0, total_agents: 0, pending_listings: 0 },
      agencyMembers: [],
      listingCounts: EMPTY_COUNTS,
      monthlyEnquiries: 0,
      recentListings: [],
    });
    return;
  }

  const { data: rows } = await supabase
    .from('listings')
    .select(`${LISTING_FIELDS}, posted_by`)
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false });
  const list = (rows ?? []) as RawListing[];
  const listingCounts = countByStatus(list);

  const recent3 = list.slice(0, 3);
  const covers = await fetchCoverPhotos(recent3.map((r) => r.id));
  const posterIds = [...new Set(recent3.map((r) => r.posted_by).filter((v): v is string => !!v))];
  const nameMap: Record<string, string> = {};
  if (posterIds.length) {
    const { data: posters } = await supabase.from('users').select('id, full_name').in('id', posterIds);
    for (const p of posters ?? []) nameMap[p.id] = p.full_name;
  }
  const recentListings = recent3.map((r) =>
    toRecent(r, covers, r.posted_by ? (nameMap[r.posted_by] ?? null) : null),
  );

  const { count: agentsCount } = await supabase
    .from('agency_members')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agency.id)
    .eq('status', 'active');

  let monthlyEnquiries = 0;
  const listingIds = list.map((r) => r.id);
  if (listingIds.length) {
    const { count: enqCount } = await supabase
      .from('enquiries')
      .select('id', { count: 'exact', head: true })
      .in('listing_id', listingIds)
      .gte('created_at', startOfMonthISO());
    monthlyEnquiries = enqCount ?? 0;
  }

  const { data: members } = await supabase
    .from('agency_members')
    .select('user_id')
    .eq('agency_id', agency.id)
    .eq('status', 'active')
    .limit(3);
  const memberUserIds = (members ?? []).map((m) => m.user_id).filter((v): v is string => !!v);
  let agencyMembers: AgencyMemberPreview[] = [];
  if (memberUserIds.length) {
    const { data: memberUsers } = await supabase
      .from('users')
      .select('id, full_name, profile_photo_url, verification_status')
      .in('id', memberUserIds);
    agencyMembers = (memberUsers ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      profile_photo_url: p.profile_photo_url,
      verification_status: p.verification_status,
    }));
  }

  setResult({
    user,
    role,
    agency,
    agencyStats: {
      total_active_listings: listingCounts.active,
      total_enquiries_month: monthlyEnquiries,
      total_agents: agentsCount ?? 0,
      pending_listings: listingCounts.pending_review,
    },
    agencyMembers,
    listingCounts,
    monthlyEnquiries,
    recentListings,
  });
}
