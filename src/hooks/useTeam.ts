import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { AgencyProfile } from '@/types/profile';

export type TeamMemberStatus = 'invited' | 'active' | 'removed';

export type TeamMember = {
  id: string; // agency_members.id
  agency_id: string;
  user_id: string | null; // null = pending invite
  full_name: string | null;
  profile_photo_url: string | null;
  verification_status: string | null;
  areas: string[];
  property_types: string[];
  status: TeamMemberStatus;
  invite_token: string | null;
  invite_expires_at: string | null;
  joined_at: string | null;
  removed_at: string | null;
  user_created_at: string | null;
};

export type UseTeam = {
  agency: AgencyProfile | null;
  members: TeamMember[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  totalActive: number;
  pendingInvites: number;
};

const STATUS_ORDER: Record<TeamMemberStatus, number> = { active: 0, invited: 1, removed: 2 };

export function useTeam(): UseTeam {
  const [agency, setAgency] = useState<AgencyProfile | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { data: agencyRow, error: aErr } = await supabase
        .from('agencies')
        .select('id, name, logo_url, cac_number, verification_status, subscription_plan')
        .eq('admin_id', user.id)
        .maybeSingle();
      if (aErr) throw new Error(aErr.message);
      if (!agencyRow) {
        setAgency(null);
        setMembers([]);
        return;
      }
      setAgency(agencyRow as AgencyProfile);

      // Step 1 — membership rows.
      const { data: memberRows, error: mErr } = await supabase
        .from('agency_members')
        .select('*')
        .eq('agency_id', agencyRow.id);
      if (mErr) throw new Error(mErr.message);

      // Step 2 — user rows for filled slots (avoids the dual-FK embed ambiguity
      // introduced by removed_by → users).
      const userIds = (memberRows ?? []).map((m) => m.user_id).filter((id): id is string => !!id);
      const usersById: Record<string, {
        full_name: string | null;
        profile_photo_url: string | null;
        verification_status: string | null;
        areas: string[] | null;
        property_types: string[] | null;
        created_at: string | null;
      }> = {};
      if (userIds.length > 0) {
        const { data: userRows } = await supabase
          .from('users')
          .select('id, full_name, profile_photo_url, verification_status, areas, property_types, created_at')
          .in('id', userIds);
        for (const u of userRows ?? []) usersById[u.id] = u;
      }

      const merged: TeamMember[] = (memberRows ?? []).map((m) => {
        const u = m.user_id ? usersById[m.user_id] : undefined;
        return {
          id: m.id,
          agency_id: m.agency_id,
          user_id: m.user_id,
          full_name: u?.full_name ?? null,
          profile_photo_url: u?.profile_photo_url ?? null,
          verification_status: u?.verification_status ?? null,
          areas: u?.areas ?? [],
          property_types: u?.property_types ?? [],
          status: m.status as TeamMemberStatus,
          invite_token: m.invite_token,
          invite_expires_at: m.invite_expires_at,
          joined_at: m.joined_at,
          removed_at: m.removed_at,
          user_created_at: u?.created_at ?? null,
        };
      });

      merged.sort((a, b) => {
        const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (s !== 0) return s;
        return (b.joined_at ?? '').localeCompare(a.joined_at ?? '');
      });
      setMembers(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totalActive = members.reduce((n, m) => n + (m.status === 'active' ? 1 : 0), 0);
  const pendingInvites = members.reduce((n, m) => n + (m.status === 'invited' ? 1 : 0), 0);

  return { agency, members, loading, error, refetch: load, totalActive, pendingInvites };
}
