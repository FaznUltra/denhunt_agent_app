import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { InspectionSession } from '@/types/database';
import type { Conversation } from '@/types/chat';

export type UseConversations = {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

async function fetchCovers(listingIds: string[]): Promise<Record<string, string>> {
  if (listingIds.length === 0) return {};
  const { data } = await supabase
    .from('listing_media')
    .select('listing_id, url, order_index')
    .in('listing_id', listingIds)
    .eq('order_index', 0);
  const map: Record<string, string> = {};
  for (const m of data ?? []) if (m.listing_id && m.url) map[m.listing_id] = m.url;
  return map;
}

// All chat conversations (inspection sessions) for the agent / agency, newest
// activity first. RLS scopes the rows. Refetches on focus.
export function useConversations(): UseConversations {
  const [conversations, setConversations] = useState<Conversation[]>([]);
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

      const { data: rows, error: qErr } = await supabase
        .from('inspection_sessions')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (qErr) throw new Error(qErr.message);
      const sessions = (rows ?? []) as InspectionSession[];

      const listingIds = [...new Set(sessions.map((s) => s.listing_id))];
      const [covers, titles, unread] = await Promise.all([
        fetchCovers(listingIds),
        (async () => {
          const map: Record<string, string> = {};
          if (listingIds.length) {
            const { data } = await supabase.from('listings').select('id, title').in('id', listingIds);
            for (const l of data ?? []) map[l.id] = l.title;
          }
          return map;
        })(),
        (async () => {
          // unread = messages from the other side not yet read, per session
          const map: Record<string, number> = {};
          const ids = sessions.map((s) => s.id);
          if (ids.length) {
            const { data } = await supabase
              .from('messages')
              .select('session_id, sender_role, read_at')
              .in('session_id', ids)
              .is('read_at', null)
              .neq('sender_role', 'agent');
            for (const m of data ?? []) map[m.session_id] = (map[m.session_id] ?? 0) + 1;
          }
          return map;
        })(),
      ]);

      setConversations(
        sessions.map((s) => ({
          id: s.id,
          renter_name: s.renter_name,
          listing_id: s.listing_id,
          listing_title: titles[s.listing_id] ?? null,
          listing_cover_photo: covers[s.listing_id] ?? null,
          status: s.status,
          chat_unlocked: s.chat_unlocked,
          last_message: s.last_message,
          last_message_at: s.last_message_at,
          unread_count: unread[s.id] ?? 0,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  return { conversations, loading, error, refetch: fetchAll };
}
