import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { uploadToStorage } from '@/lib/storage';
import { updateBadgeCount } from '@/services/notifications';
import type { InspectionSession } from '@/types/database';
import type { ChatMessage, DisputeInfo, EvidenceItem } from '@/types/chat';

export type UseChat = {
  session: InspectionSession | null;
  messages: ChatMessage[];
  dispute: DisputeInfo | null;
  loading: boolean;
  error: string | null;
  sending: boolean;
  othersTyping: boolean;
  send: (body: string, replyTo?: string | null) => Promise<void>;
  sendImage: (localUri: string, replyTo?: string | null) => Promise<void>;
  retry: (message: ChatMessage) => Promise<void>;
  sendTyping: () => void;
  markRead: () => Promise<void>;
  refetchSession: () => Promise<void>;
  refetchDispute: () => Promise<void>;
  confirmInspectionCode: (code: string) => Promise<boolean>;
  addAgentEvidence: (localUri: string, type: 'photo' | 'video', contentType: string) => Promise<boolean>;
  submitDisputeResponse: (statement: string) => Promise<boolean>;
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
  const [dispute, setDispute] = useState<DisputeInfo | null>(null);
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

  // Load the dispute (if any) + its evidence, split by side.
  const refetchDispute = useCallback(async () => {
    const { data: d } = await supabase
      .from('disputes')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!d) {
      setDispute(null);
      return;
    }
    const { data: ev } = await supabase
      .from('inspection_evidence')
      .select('*')
      .eq('session_id', sessionId)
      .order('uploaded_at', { ascending: true });
    const evidence = (ev ?? []) as EvidenceItem[];
    setDispute({
      id: d.id,
      reason: d.reason,
      description: d.description,
      status: d.status,
      created_at: d.created_at,
      renter_evidence: evidence.filter((e) => e.submitted_by === 'renter'),
      agent_evidence: evidence.filter((e) => e.submitted_by === 'agent'),
    });
  }, [sessionId]);

  // Validate the renter's 6-digit code and start the inspection (8h escrow).
  // TODO: move code validation to an Edge Function before production to prevent
  // client-side spoofing.
  const confirmInspectionCode = useCallback(
    async (code: string): Promise<boolean> => {
      try {
        const { data: s } = await supabase
          .from('inspection_sessions')
          .select('inspection_code')
          .eq('id', sessionId)
          .single();
        if (!s || s.inspection_code !== code) return false;

        const releaseAt = new Date();
        releaseAt.setHours(releaseAt.getHours() + 8);
        const { error: updErr } = await supabase
          .from('inspection_sessions')
          .update({ status: 'in_progress', code_confirmed_at: new Date().toISOString(), escrow_release_at: releaseAt.toISOString() })
          .eq('id', sessionId);
        if (updErr) return false;

        await supabase.from('messages').insert({
          session_id: sessionId,
          sender_role: 'system',
          type: 'system',
          body: 'Inspection started. Escrow releases automatically in 8 hours.',
          metadata: { type: 'inspection_started', release_at: releaseAt.toISOString() },
        });
        await refetchSession();
        return true;
      } catch {
        return false;
      }
    },
    [sessionId, refetchSession],
  );

  // Upload agent inspection/dispute evidence to the private chat-media bucket.
  const addAgentEvidence = useCallback(
    async (localUri: string, type: 'photo' | 'video', contentType: string): Promise<boolean> => {
      if (!userIdRef.current) return false;
      try {
        const ext = type === 'video' ? 'mp4' : 'jpg';
        const path = `${userIdRef.current}/${sessionId}/evidence_${Date.now()}.${ext}`;
        const url = await uploadToStorage('chat-media', path, localUri, contentType);
        await supabase.from('inspection_evidence').insert({ session_id: sessionId, submitted_by: 'agent', type, url });
        await supabase.from('messages').insert({
          session_id: sessionId,
          sender_role: 'system',
          type: 'system',
          body: 'Agent recorded inspection evidence',
          metadata: { type: 'evidence_recorded', submitted_by: 'agent' },
        });
        await refetchDispute();
        return true;
      } catch {
        return false;
      }
    },
    [sessionId, refetchDispute],
  );

  const submitDisputeResponse = useCallback(
    async (statement: string): Promise<boolean> => {
      if (!dispute || !userIdRef.current) return false;
      try {
        await supabase
          .from('dispute_responses')
          .insert({ dispute_id: dispute.id, submitted_by: userIdRef.current, statement: statement.trim() || null });
        await supabase.from('messages').insert({
          session_id: sessionId,
          sender_role: 'system',
          type: 'system',
          body: 'You submitted a response to DenHunt',
          metadata: { type: 'agent_responded_to_dispute' },
        });
        return true;
      } catch {
        return false;
      }
    },
    [dispute, sessionId],
  );

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

  // Load the dispute (if any) on mount / session change.
  useEffect(() => {
    refetchDispute();
  }, [refetchDispute]);

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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'disputes', filter: `session_id=eq.${sessionId}` },
        () => refetchDispute(),
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
  }, [sessionId, refetchDispute]);

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
      // TODO Phase 2: when the renter app ships, push to the renter's device
      // here via sendPushNotification({ recipientUserId: session.renter_id, ... })
      // — NotificationTemplates.newMessage / imageMessage. The renter has no
      // device token in Phase 1, so there is no recipient yet.
      updateBadgeCount();
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
        metadata: null,
        created_at: new Date().toISOString(),
        read_at: null,
        pending: true,
      };
      await insertMessage(temp);
      setSending(false);
    },
    [insertMessage, sessionId],
  );

  // Send an image: compress, show optimistically with the local URI, upload to
  // the private chat-media bucket, then swap in the remote URL.
  const sendImage = useCallback(
    async (localUri: string, replyTo: string | null = null) => {
      let workingUri = localUri;
      try {
        const compressed = await manipulateAsync(localUri, [{ resize: { width: 1200 } }], {
          compress: 0.85,
          format: SaveFormat.JPEG,
        });
        workingUri = compressed.uri;
      } catch {
        // Fall back to the original URI if compression fails.
      }

      const tempId = `temp-${Date.now()}`;
      const temp: ChatMessage = {
        id: tempId,
        session_id: sessionId,
        sender_role: 'agent',
        sender_id: userIdRef.current,
        type: 'image',
        body: null,
        image_url: workingUri, // local URI for instant display
        reply_to: replyTo,
        metadata: null,
        created_at: new Date().toISOString(),
        read_at: null,
        pending: true,
      };
      setMessages((prev) => mergeMessage(prev, temp));

      try {
        const path = `${userIdRef.current}/${sessionId}/img_${Date.now()}.jpg`;
        const remoteUrl = await uploadToStorage('chat-media', path, workingUri, 'image/jpeg');
        const { data, error: insErr } = await supabase
          .from('messages')
          .insert({
            session_id: sessionId,
            sender_role: 'agent',
            sender_id: userIdRef.current,
            type: 'image',
            image_url: remoteUrl,
            reply_to: replyTo,
          })
          .select('*')
          .single();
        if (insErr || !data) throw insErr ?? new Error('insert failed');
        setMessages((prev) => mergeMessage(prev.filter((m) => m.id !== tempId), data as ChatMessage));
      } catch {
        // Keep the local URI on the failed message so retry can re-upload it.
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
        );
      }
    },
    [sessionId],
  );

  const retry = useCallback(
    async (message: ChatMessage) => {
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      if (message.type === 'image' && message.image_url) {
        await sendImage(message.image_url, message.reply_to);
        return;
      }
      await insertMessage({ ...message, id: `temp-${Date.now()}`, pending: true, failed: false });
    },
    [insertMessage, sendImage],
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
    dispute,
    loading,
    error,
    sending,
    othersTyping,
    send,
    sendImage,
    retry,
    sendTyping,
    markRead,
    refetchSession,
    refetchDispute,
    confirmInspectionCode,
    addAgentEvidence,
    submitDisputeResponse,
  };
}
