import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { InspectionSession, Message } from '@/types/database';
import type { ChatMessage } from '@/types/chat';

export type UseChat = {
  session: InspectionSession | null;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  othersTyping: boolean;
  send: (body: string, replyTo?: string | null) => Promise<void>;
  retry: (message: ChatMessage) => Promise<void>;
  sendTyping: () => void;
  markRead: () => Promise<void>;
  refetchSession: () => Promise<void>;
};

function sortByTime(list: ChatMessage[]): ChatMessage[] {
  return [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// Insert/replace a message by id (dedupes realtime echo vs optimistic).
function mergeMessage(prev: ChatMessage[], msg: ChatMessage): ChatMessage[] {
  const exists = prev.some((m) => m.id === msg.id);
  return sortByTime(exists ? prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)) : [...prev, msg]);
}

// Realtime chat for one inspection session: messages, optimistic send, read
// receipts, and typing broadcast. See PRD §6.5.
export function useChat(sessionId: string): UseChat {
  const [session, setSession] = useState<InspectionSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [othersTyping, setOthersTyping] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetchSession = useCallback(async () => {
    const { data } = await supabase.from('inspection_sessions').select('*').eq('id', sessionId).maybeSingle();
    if (data) setSession(data as InspectionSession);
  }, [sessionId]);

  // Initial load.
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userIdRef.current = user?.id ?? null;

        const [{ data: s, error: sErr }, { data: msgs, error: mErr }] = await Promise.all([
          supabase.from('inspection_sessions').select('*').eq('id', sessionId).maybeSingle(),
          supabase.from('messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
        ]);
        if (sErr) throw new Error(sErr.message);
        if (mErr) throw new Error(mErr.message);
        if (!mounted) return;
        setSession((s as InspectionSession) ?? null);
        setMessages((msgs ?? []) as ChatMessage[]);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load chat');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  // Realtime: new/updated messages, session updates, and typing broadcast.
  useEffect(() => {
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${sessionId}` },
        (payload) => setMessages((prev) => mergeMessage(prev, payload.new as ChatMessage)),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `session_id=eq.${sessionId}` },
        (payload) => setMessages((prev) => mergeMessage(prev, payload.new as ChatMessage)),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'inspection_sessions', filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as InspectionSession),
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.role && payload.role !== 'agent') {
          setOthersTyping(true);
          if (typingTimer.current) clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setOthersTyping(false), 3000);
        }
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [sessionId]);

  const insertMessage = useCallback(
    async (temp: ChatMessage) => {
      setMessages((prev) => mergeMessage(prev, temp));
      const { data, error: insErr } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          sender_role: 'agent',
          sender_id: userIdRef.current,
          type: temp.type,
          body: temp.body,
          image_url: temp.image_url,
          reply_to: temp.reply_to,
        })
        .select('*')
        .single();
      if (insErr || !data) {
        setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...m, pending: false, failed: true } : m)));
        return;
      }
      setMessages((prev) => mergeMessage(prev.filter((m) => m.id !== temp.id), data as ChatMessage));
    },
    [sessionId],
  );

  const send = useCallback(
    async (body: string, replyTo: string | null = null) => {
      const text = body.trim();
      if (!text) return;
      setSending(true);
      const temp: ChatMessage = {
        id: `temp-${Date.now()}`,
        session_id: sessionId,
        sender_role: 'agent',
        sender_id: userIdRef.current,
        type: 'text',
        body: text,
        image_url: null,
        reply_to: replyTo,
        created_at: new Date().toISOString(),
        read_at: null,
        pending: true,
      };
      await insertMessage(temp);
      setSending(false);
    },
    [insertMessage, sessionId],
  );

  const retry = useCallback(
    async (message: ChatMessage) => {
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      await insertMessage({ ...message, id: `temp-${Date.now()}`, pending: true, failed: false });
    },
    [insertMessage],
  );

  const sendTyping = useCallback(() => {
    channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { role: 'agent' } });
  }, []);

  const markRead = useCallback(async () => {
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .is('read_at', null)
      .neq('sender_role', 'agent');
  }, [sessionId]);

  return {
    session,
    messages,
    loading,
    error,
    sending,
    othersTyping,
    send,
    retry,
    sendTyping,
    markRead,
    refetchSession,
  };
}
