import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import Feather from '@expo/vector-icons/Feather';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Avatar, Skeleton } from '@/components/ui';
import { formatDate } from '@/utils/format';
import { useChat } from '@/hooks/useChat';
import { supabase } from '@/lib/supabase';
import type { ChatMessage, ReplyTarget } from '@/types/chat';

function timeOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, messages, loading, error, sending, othersTyping, send, retry, sendTyping, markRead, refetchSession } =
    useChat(id);

  const [text, setText] = useState('');
  const [reply, setReply] = useState<ReplyTarget | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // Mark incoming messages read when the thread is open.
  useEffect(() => {
    if (messages.some((m) => m.sender_role !== 'agent' && !m.read_at)) markRead();
  }, [messages, markRead]);

  const byId = useMemo(() => {
    const map: Record<string, ChatMessage> = {};
    for (const m of messages) map[m.id] = m;
    return map;
  }, [messages]);

  // Inverted list shows newest at the bottom.
  const data = useMemo(() => [...messages].reverse(), [messages]);

  function handleSend() {
    const body = text.trim();
    if (!body) return;
    setText('');
    const replyTo = reply?.id ?? null;
    setReply(null);
    send(body, replyTo);
  }

  async function postSystem(body: string) {
    await supabase.from('messages').insert({ session_id: id, sender_role: 'system', sender_id: null, type: 'system', body });
  }

  async function acceptReschedule() {
    if (!session?.proposed_date) return;
    const newDate = session.proposed_date;
    const { error: e } = await supabase
      .from('inspection_sessions')
      .update({ scheduled_date: newDate, status: 'escrow_held', proposed_date: null, proposed_by: null })
      .eq('id', id);
    if (e) {
      Alert.alert('Could not reschedule', e.message);
      return;
    }
    await postSystem(`Inspection rescheduled to ${formatDate(newDate)}.`);
    await refetchSession();
  }

  function openReschedule() {
    setTempDate(session?.proposed_date ? new Date(session.proposed_date) : new Date());
    setDatePickerOpen(true);
  }

  async function proposeReschedule(date: Date) {
    const iso = date.toISOString().slice(0, 10);
    const { error: e } = await supabase
      .from('inspection_sessions')
      .update({ proposed_date: iso, proposed_by: 'agent', status: 'reschedule_pending' })
      .eq('id', id);
    if (e) {
      Alert.alert('Could not propose date', e.message);
      return;
    }
    await postSystem(`Agent proposed a new inspection date: ${formatDate(iso)}.`);
    await refetchSession();
  }

  function onDateChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setDatePickerOpen(false);
      if (event.type === 'set' && date) proposeReschedule(date);
    } else if (date) {
      setTempDate(date);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.skeletonBody}>
          <Skeleton width="50%" height={18} />
          <Skeleton width="80%" height={44} borderRadius={16} />
          <Skeleton width="60%" height={44} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }
  if (error || !session) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.notFound}>
          <Feather name="alert-circle" size={40} color={colors.gray400} />
          <Text style={styles.notFoundTitle}>{error ? "Couldn't load chat" : 'Conversation not found'}</Text>
          <Pressable style={styles.notFoundCta} onPress={() => router.push('/(agent)/chat' as Href)}>
            <Text style={styles.notFoundCtaText}>Back to messages</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const locked = !session.chat_unlocked;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to messages"
            style={styles.backButton}
            onPress={() => router.push('/(agent)/chat' as Href)}>
            <Feather name="arrow-left" size={20} color={colors.gray900} />
          </Pressable>
          <Avatar name={session.renter_name} size={36} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {session.renter_name}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {othersTyping ? 'typing…' : 'Inspection chat'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Report conversation"
            style={styles.backButton}
            onPress={() => Alert.alert('Report conversation', 'This conversation will be sent to DenHunt for review.')}>
            <Feather name="flag" size={18} color={colors.gray500} />
          </Pressable>
        </View>

        <ContextBanner
          session={session}
          onAccept={acceptReschedule}
          onPropose={openReschedule}
        />

        {/* Messages */}
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          renderItem={({ item }) => (
            <MessageRow
              message={item}
              repliedTo={item.reply_to ? byId[item.reply_to] : undefined}
              onReply={(m) =>
                setReply({
                  id: m.id,
                  preview: m.body ?? (m.type === 'image' ? 'Photo' : ''),
                  senderRole: m.sender_role,
                })
              }
              onRetry={retry}
            />
          )}
        />

        {/* Reply preview */}
        {reply ? (
          <View style={styles.replyBar}>
            <View style={styles.replyAccent} />
            <View style={styles.flex}>
              <Text style={styles.replyWho}>{reply.senderRole === 'agent' ? 'You' : session.renter_name}</Text>
              <Text style={styles.replyPreview} numberOfLines={1}>
                {reply.preview}
              </Text>
            </View>
            <Pressable onPress={() => setReply(null)} hitSlop={8}>
              <Feather name="x" size={18} color={colors.gray500} />
            </Pressable>
          </View>
        ) : null}

        {/* Composer / locked notice */}
        {locked ? (
          <View style={[styles.lockedBar, { paddingBottom: insets.bottom + 12 }]}>
            <Feather name="lock" size={16} color={colors.gray400} />
            <Text style={styles.lockedText}>Chat unlocks after the renter pays the inspection fee.</Text>
          </View>
        ) : (
          <View style={[styles.composer, { paddingBottom: insets.bottom + 8 }]}>
            <Pressable
              accessibilityLabel="Attach image"
              style={styles.attachBtn}
              onPress={() => Alert.alert('Photos', 'Image sharing is coming next.')}>
              <Feather name="image" size={22} color={colors.gray500} />
            </Pressable>
            <TextInput
              style={styles.input}
              placeholder="Message"
              placeholderTextColor={colors.gray400}
              value={text}
              onChangeText={(t) => {
                setText(t);
                sendTyping();
              }}
              multiline
            />
            <Pressable
              accessibilityLabel="Send"
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              disabled={!text.trim() || sending}
              onPress={handleSend}>
              <Feather name="send" size={18} color={colors.white} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Reschedule date picker */}
      {datePickerOpen && Platform.OS === 'ios' ? (
        <View style={styles.dateModalWrap}>
          <Pressable style={styles.dateBackdrop} onPress={() => setDatePickerOpen(false)} />
          <View style={[styles.dateSheet, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.dateHandle} />
            <Text style={styles.dateTitle}>Propose a new date</Text>
            <DateTimePicker value={tempDate} mode="date" display="inline" minimumDate={new Date()} onChange={onDateChange} accentColor={colors.blue600} />
            <Pressable
              style={styles.dateDone}
              onPress={() => {
                setDatePickerOpen(false);
                proposeReschedule(tempDate);
              }}>
              <Text style={styles.dateDoneText}>Propose date</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {datePickerOpen && Platform.OS === 'android' ? (
        <DateTimePicker value={tempDate} mode="date" display="default" minimumDate={new Date()} onChange={onDateChange} />
      ) : null}
    </SafeAreaView>
  );
}

function ContextBanner({
  session,
  onAccept,
  onPropose,
}: {
  session: NonNullable<ReturnType<typeof useChat>['session']>;
  onAccept: () => void;
  onPropose: () => void;
}) {
  if (session.status === 'reschedule_pending' && session.proposed_date) {
    const fromRenter = session.proposed_by === 'renter';
    return (
      <View style={[styles.banner, styles.bannerWarn]}>
        <Feather name="calendar" size={16} color={colors.warningText} />
        <Text style={styles.bannerText}>
          {fromRenter ? 'Renter proposed' : 'You proposed'} {formatDate(session.proposed_date)}
        </Text>
        {fromRenter ? (
          <View style={styles.bannerActions}>
            <Pressable style={styles.bannerBtnGhost} onPress={onPropose}>
              <Text style={styles.bannerBtnGhostText}>Counter</Text>
            </Pressable>
            <Pressable style={styles.bannerBtn} onPress={onAccept}>
              <Text style={styles.bannerBtnText}>Accept</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.bannerWaiting}>Waiting…</Text>
        )}
      </View>
    );
  }

  if (session.status === 'in_progress') {
    return (
      <View style={[styles.banner, styles.bannerSuccess]}>
        <Feather name="clock" size={16} color={colors.successText} />
        <Text style={[styles.bannerText, { color: colors.successText }]}>
          Inspection in progress · escrow in holding
        </Text>
      </View>
    );
  }
  if (session.status === 'completed') {
    return (
      <View style={[styles.banner, styles.bannerSuccess]}>
        <Feather name="check-circle" size={16} color={colors.successText} />
        <Text style={[styles.bannerText, { color: colors.successText }]}>Inspection completed · escrow released</Text>
      </View>
    );
  }
  if (session.status === 'disputed') {
    return (
      <View style={[styles.banner, styles.bannerError]}>
        <Feather name="alert-triangle" size={16} color={colors.errorText} />
        <Text style={[styles.bannerText, { color: colors.errorText }]}>Dispute under review</Text>
      </View>
    );
  }
  if (session.chat_unlocked && session.scheduled_date) {
    return (
      <View style={styles.banner}>
        <Feather name="calendar" size={16} color={colors.blue600} />
        <Text style={[styles.bannerText, { color: colors.blue800 }]}>
          Inspection {formatDate(session.scheduled_date)}
        </Text>
        <Pressable style={styles.bannerBtnGhost} onPress={onPropose}>
          <Text style={styles.bannerBtnGhostText}>Reschedule</Text>
        </Pressable>
      </View>
    );
  }
  return null;
}

function MessageRow({
  message,
  repliedTo,
  onReply,
  onRetry,
}: {
  message: ChatMessage;
  repliedTo?: ChatMessage;
  onReply: (m: ChatMessage) => void;
  onRetry: (m: ChatMessage) => void;
}) {
  const swipeRef = useRef<Swipeable>(null);

  if (message.type === 'system') {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.systemText}>{message.body}</Text>
      </View>
    );
  }

  const mine = message.sender_role === 'agent';

  const bubble = (
    <Pressable
      onPress={() => (message.failed ? onRetry(message) : undefined)}
      style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {repliedTo ? (
          <View style={[styles.quote, mine ? styles.quoteMine : styles.quoteTheirs]}>
            <Text style={[styles.quoteWho, mine && styles.quoteTextMine]}>
              {repliedTo.sender_role === 'agent' ? 'You' : 'Renter'}
            </Text>
            <Text style={[styles.quoteText, mine && styles.quoteTextMine]} numberOfLines={1}>
              {repliedTo.body ?? 'Photo'}
            </Text>
          </View>
        ) : null}
        <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
          {message.body}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.metaTime, mine ? styles.metaTimeMine : styles.metaTimeTheirs]}>
            {timeOf(message.created_at)}
          </Text>
          {mine ? (
            message.failed ? (
              <Feather name="alert-circle" size={12} color={colors.errorBg} />
            ) : message.pending ? (
              <Feather name="clock" size={11} color="rgba(255,255,255,0.7)" />
            ) : (
              <Text style={styles.receipt}>{message.read_at ? '✓✓' : '✓'}</Text>
            )
          ) : null}
        </View>
      </View>
    </Pressable>
  );

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      leftThreshold={36}
      overshootLeft={false}
      renderLeftActions={() => <View style={styles.replyAction}><Feather name="corner-up-left" size={18} color={colors.gray400} /></View>}
      onSwipeableOpen={() => {
        onReply(message);
        swipeRef.current?.close();
      }}>
      {bubble}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray50 },
  flex: { flex: 1 },
  skeletonBody: { padding: 20, gap: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  backButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headerName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.gray900 },
  headerSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 1 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.blue50,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerWarn: { backgroundColor: colors.warningBg },
  bannerSuccess: { backgroundColor: colors.successBg },
  bannerError: { backgroundColor: colors.errorBg },
  bannerText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.warningText },
  bannerWaiting: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500 },
  bannerActions: { flexDirection: 'row', gap: 8 },
  bannerBtn: { backgroundColor: colors.blue600, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  bannerBtnText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.white },
  bannerBtnGhost: { borderWidth: 1.5, borderColor: colors.blue600, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 12 },
  bannerBtnGhostText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.blue600 },

  listContent: { paddingHorizontal: 12, paddingVertical: 12, gap: 6 },

  systemWrap: { alignItems: 'center', marginVertical: 6, paddingHorizontal: 24 },
  systemText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.gray500,
    backgroundColor: colors.gray100,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    textAlign: 'center',
    overflow: 'hidden',
  },

  bubbleRow: { flexDirection: 'row', marginVertical: 2 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 },
  bubbleMine: { backgroundColor: colors.blue600, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.gray100 },
  bubbleText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: colors.white },
  bubbleTextTheirs: { color: colors.gray900 },
  quote: { borderLeftWidth: 3, borderRadius: 6, paddingLeft: 8, paddingVertical: 3, marginBottom: 4 },
  quoteMine: { borderLeftColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.12)' },
  quoteTheirs: { borderLeftColor: colors.blue600, backgroundColor: colors.gray50 },
  quoteWho: { fontFamily: fonts.semibold, fontSize: 11, color: colors.blue600 },
  quoteText: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500 },
  quoteTextMine: { color: 'rgba(255,255,255,0.85)' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 },
  metaTime: { fontFamily: fonts.regular, fontSize: 10 },
  metaTimeMine: { color: 'rgba(255,255,255,0.7)' },
  metaTimeTheirs: { color: colors.gray400 },
  receipt: { fontFamily: fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  replyAction: { justifyContent: 'center', paddingHorizontal: 20 },

  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyAccent: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.blue600 },
  replyWho: { fontFamily: fonts.semibold, fontSize: 12, color: colors.blue600 },
  replyPreview: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  attachBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    backgroundColor: colors.gray50,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.gray900,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  lockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  lockedText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.gray500 },

  dateModalWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  dateBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  dateSheet: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 8 },
  dateHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.gray200, alignSelf: 'center', marginBottom: 8 },
  dateTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.gray900, paddingHorizontal: 4, marginBottom: 4 },
  dateDone: { backgroundColor: colors.blue600, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  dateDoneText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  notFoundTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.gray900, marginTop: 16 },
  notFoundCta: { marginTop: 20, borderRadius: 12, borderWidth: 1.5, borderColor: colors.blue600, paddingVertical: 12, paddingHorizontal: 24 },
  notFoundCtaText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.blue600 },
});
