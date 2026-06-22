import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { clearBadge, updateBadgeCount } from '@/services/notifications';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, string> | null;
  is_read: boolean;
  created_at: string;
};

export type UseNotifications = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAllRead: () => Promise<void>;
  markOneRead: (id: string) => Promise<void>;
  refetch: () => void;
};

// Loads the current user's notifications, keeps unread count + badge in sync,
// and subscribes to Realtime inserts for live updates.
export function useNotifications(): UseNotifications {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refetch = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userIdRef.current = user?.id ?? null;
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data ?? []) as AppNotification[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime: new notifications for this user.
  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !active) return;
      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => {
            refetch();
            updateBadgeCount();
          },
        )
        .subscribe();
      channelRef.current = channel;
    })();
    return () => {
      active = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [refetch]);

  const markAllRead = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', uid).eq('is_read', false);
    await clearBadge();
    refetch();
  }, [refetch]);

  const markOneRead = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      await updateBadgeCount();
      refetch();
    },
    [refetch],
  );

  const unreadCount = notifications.reduce((acc, n) => acc + (n.is_read ? 0 : 1), 0);

  return { notifications, unreadCount, loading, markAllRead, markOneRead, refetch };
}
