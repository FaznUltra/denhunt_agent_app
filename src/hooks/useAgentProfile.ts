import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { AgentProfile, AgencyProfile, ProfileStats, SubscriptionInfo } from '@/types/profile';
import type { UserRole } from '@/types/database';

export type UseAgentProfile = {
  profile: AgentProfile | null;
  agency: AgencyProfile | null;
  subscription: SubscriptionInfo | null;
  stats: ProfileStats;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const EMPTY_STATS: ProfileStats = { active_listings_count: 0, total_enquiries_count: 0 };

export function useAgentProfile(): UseAgentProfile {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [agency, setAgency] = useState<AgencyProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [stats, setStats] = useState<ProfileStats>(EMPTY_STATS);
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

      const { data: u, error: uErr } = await supabase
        .from('users')
        .select(
          'id, full_name, email, phone, profile_photo_url, role, status, verification_status, years_experience, areas, property_types, bio, created_at',
        )
        .eq('id', user.id)
        .single();
      if (uErr || !u) throw new Error(uErr?.message ?? 'Profile not found');

      const role = u.role as UserRole;
      const loaded: AgentProfile = {
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        phone: u.phone,
        profile_photo_url: u.profile_photo_url,
        role,
        status: u.status,
        verification_status: u.verification_status,
        years_experience: u.years_experience,
        areas: u.areas ?? [],
        property_types: u.property_types ?? [],
        bio: u.bio,
        created_at: u.created_at,
      };
      setProfile(loaded);

      // Agency (for agency roles).
      if (role === 'agency_admin') {
        const { data: ag } = await supabase
          .from('agencies')
          .select('id, name, logo_url, cac_number, verification_status, subscription_plan')
          .eq('admin_id', user.id)
          .maybeSingle();
        setAgency((ag as AgencyProfile) ?? null);
      } else if (role === 'agency_agent') {
        const { data: member } = await supabase
          .from('agency_members')
          .select('agency_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        if (member?.agency_id) {
          const { data: ag } = await supabase
            .from('agencies')
            .select('id, name, logo_url, cac_number, verification_status, subscription_plan')
            .eq('id', member.agency_id)
            .maybeSingle();
          setAgency((ag as AgencyProfile) ?? null);
        } else {
          setAgency(null);
        }
      } else {
        setAgency(null);
      }

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan, billing_cycle, status, trial_ends_at, current_period_end')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setSubscription((sub as SubscriptionInfo) ?? null);

      const [{ count: activeCount }, { count: enquiriesCount }] = await Promise.all([
        supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('posted_by', user.id)
          .eq('status', 'active'),
        supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('agent_id', user.id),
      ]);
      setStats({
        active_listings_count: activeCount ?? 0,
        total_enquiries_count: enquiriesCount ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  return { profile, agency, subscription, stats, loading, error, refetch: fetchAll };
}
