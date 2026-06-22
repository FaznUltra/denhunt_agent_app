import { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Avatar, SectionLabel, Skeleton } from '@/components/ui';
import { formatDate, formatPrice, formatRelativeDate, paymentPeriod } from '@/utils/format';
import { getEnquiryStatusBadge, ENQUIRY_DOT } from '@/utils/statusBadge';
import { useEnquiryDetail } from '@/hooks/useEnquiryDetail';
import { supabase } from '@/lib/supabase';
import type { EnquiryStatus } from '@/types/enquiries';

const ENQUIRIES_HREF = '/(agent)/enquiries' as Href;

const STATUS_OPTIONS: { value: EnquiryStatus; label: string; desc: string }[] = [
  { value: 'new', label: 'New', desc: 'Not yet responded to' },
  { value: 'contacted', label: 'Contacted', desc: "You've been in touch" },
  { value: 'inspection_scheduled', label: 'Inspection scheduled', desc: 'Inspection date agreed' },
  { value: 'closed', label: 'Closed', desc: 'Deal completed' },
  { value: 'not_interested', label: 'Not interested', desc: 'Renter no longer interested' },
];

export default function EnquiryDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { enquiry, listing, loading, error, refetch } = useEnquiryDetail(id);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [scheduling, setScheduling] = useState(false);

  function backToInbox() {
    router.push(ENQUIRIES_HREF);
  }

  // Schedule an inspection → creates the inspection session (chat stays locked
  // until the renter pays the fee into escrow). See PRD §6.5.
  async function createSession(date: Date) {
    if (!enquiry) return;
    setScheduling(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const iso = date.toISOString().slice(0, 10);
      const { data, error: e } = await supabase
        .from('inspection_sessions')
        .insert({
          enquiry_id: enquiry.id,
          listing_id: enquiry.listing_id,
          agent_id: user.id,
          renter_name: enquiry.enquirer_name,
          inspection_fee: listing?.inspection_fee ?? 0,
          scheduled_date: iso,
          status: 'scheduled',
          chat_unlocked: false,
        })
        .select('id')
        .single();
      if (e || !data) throw new Error(e?.message ?? 'Could not schedule');
      await supabase.from('enquiries').update({ status: 'inspection_scheduled' }).eq('id', enquiry.id);
      router.push(`/(agent)/chat/${data.id}` as Href);
    } catch (err) {
      Alert.alert('Could not schedule', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setScheduling(false);
    }
  }

  function onDateChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setDatePickerOpen(false);
      if (event.type === 'set' && date) createSession(date);
    } else if (date) {
      setTempDate(date);
    }
  }

  async function changeStatus(status: EnquiryStatus) {
    if (!enquiry || status === enquiry.status) return;
    try {
      const { error: updErr } = await supabase.from('enquiries').update({ status }).eq('id', enquiry.id);
      if (updErr) throw new Error(updErr.message);
      await refetch();
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  if (loading) return <DetailSkeleton />;
  if (error || !enquiry) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.notFound}>
          <Feather name="alert-circle" size={40} color={colors.gray400} />
          <Text style={styles.notFoundTitle}>{error ? "Couldn't load enquiry" : 'Enquiry not found'}</Text>
          <Text style={styles.notFoundBody}>This enquiry may have been removed.</Text>
          <Pressable style={styles.notFoundCta} onPress={backToInbox}>
            <Text style={styles.notFoundCtaText}>Back to enquiries</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const badge = getEnquiryStatusBadge(enquiry.status);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SECTION 1 — header */}
        <View style={styles.headerSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to enquiries"
            style={styles.backButton}
            onPress={backToInbox}>
            <Feather name="arrow-left" size={20} color={colors.gray900} />
          </Pressable>

          <View style={styles.enquirerCard}>
            <Avatar name={enquiry.enquirer_name} size={52} />
            <View style={styles.enquirerInfo}>
              <Text style={styles.enquirerName}>{enquiry.enquirer_name}</Text>
              <Text style={styles.enquirerContact}>{enquiry.enquirer_phone}</Text>
              {enquiry.enquirer_email ? (
                <Text style={styles.enquirerEmail}>{enquiry.enquirer_email}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
            <Text style={styles.receivedText}>Received {formatRelativeDate(enquiry.created_at)}</Text>
          </View>
        </View>

        {/* SECTION 2 — how communication works */}
        <View style={styles.block}>
          <SectionLabel text="Messaging" />
          <View style={styles.escrowNote}>
            <Feather name="lock" size={14} color={colors.blue600} />
            <Text style={styles.escrowNoteText}>
              In-app chat opens after you schedule an inspection and the renter pays the fee (held in
              escrow). All communication stays on DenHunt — keeping you and the renter protected.
            </Text>
          </View>
        </View>

        {/* SECTION 3 — message */}
        {enquiry.message ? (
          <View style={styles.block}>
            <SectionLabel text="Their message" />
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{enquiry.message}</Text>
            </View>
            {enquiry.preferred_inspection_date ? (
              <View style={styles.prefersBox}>
                <Feather name="calendar" size={16} color={colors.blue600} />
                <Text style={styles.prefersText}>
                  Prefers to inspect on {formatDate(enquiry.preferred_inspection_date)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* SECTION 4 — listing context */}
        {listing ? (
          <View style={styles.block}>
            <SectionLabel text="Enquiry about" />
            <Pressable
              style={styles.listingCard}
              onPress={() => router.push(`/(agent)/listings/${listing.id}` as Href)}>
              <View style={styles.listingPhoto}>
                {listing.cover_photo_url ? (
                  <Image source={{ uri: listing.cover_photo_url }} style={styles.listingImage} resizeMode="cover" />
                ) : (
                  <View style={styles.listingPlaceholder}>
                    <Feather name="home" size={24} color={colors.blue600} />
                  </View>
                )}
              </View>
              <View style={styles.listingBody}>
                <Text style={styles.listingTitle} numberOfLines={1}>
                  {listing.title}
                </Text>
                <Text style={styles.listingPrice}>
                  {formatPrice(listing.price)} {paymentPeriod(listing.payment_frequency)}
                </Text>
                {enquiry.listing_agent_name ? (
                  <Text style={styles.listingAgent}>Listing by {enquiry.listing_agent_name}</Text>
                ) : null}
                <View style={styles.listingMeta}>
                  {listing.bedrooms != null ? (
                    <Text style={styles.listingMetaText}>{listing.bedrooms} beds</Text>
                  ) : null}
                  <Text style={styles.listingMetaText} numberOfLines={1}>
                    {[listing.area, listing.state].filter(Boolean).join(', ')}
                  </Text>
                  <Feather name="chevron-right" size={14} color={colors.gray400} />
                </View>
              </View>
              {listing.inspection_fee ? (
                <View style={styles.feeBlock}>
                  <Feather name="shield" size={14} color={colors.successText} />
                  <Text style={styles.feeText}>
                    Inspection fee: {formatPrice(listing.inspection_fee)} · Escrow protected
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        ) : null}

        {/* SECTION 5 — update status */}
        <View style={styles.block}>
          <SectionLabel text="Update status" />
          <View style={styles.statusList}>
            {STATUS_OPTIONS.map((opt) => {
              const current = enquiry.status === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.statusOption, current && styles.statusOptionCurrent]}
                  onPress={() => changeStatus(opt.value)}>
                  <View style={[styles.dot, { backgroundColor: ENQUIRY_DOT[opt.value] }]} />
                  <View style={styles.statusTextWrap}>
                    <Text style={styles.statusLabel}>{opt.label}</Text>
                    <Text style={styles.statusDesc}>{opt.desc}</Text>
                  </View>
                  {current ? <Feather name="check" size={18} color={colors.blue600} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[styles.bottomBtn, styles.scheduleBtn, scheduling && styles.disabledBtn]}
          disabled={scheduling}
          onPress={() => {
            setTempDate(new Date());
            setDatePickerOpen(true);
          }}>
          <Feather name="calendar" size={16} color={colors.white} />
          <Text style={styles.scheduleBtnText}>{scheduling ? 'Scheduling…' : 'Schedule inspection'}</Text>
        </Pressable>
      </View>

      {/* Schedule date picker */}
      {datePickerOpen && Platform.OS === 'ios' ? (
        <View style={styles.dateModalWrap}>
          <Pressable style={styles.dateBackdrop} onPress={() => setDatePickerOpen(false)} />
          <View style={[styles.dateSheet, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.dateHandle} />
            <Text style={styles.dateTitle}>Inspection date</Text>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="inline"
              minimumDate={new Date()}
              onChange={onDateChange}
              accentColor={colors.blue600}
              themeVariant="light"
              textColor={colors.gray900}
            />
            <Pressable
              style={styles.dateDone}
              onPress={() => {
                setDatePickerOpen(false);
                createSession(tempDate);
              }}>
              <Text style={styles.dateDoneText}>Schedule</Text>
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

function DetailSkeleton() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.skeletonBody}>
        <Skeleton width={36} height={36} borderRadius={10} />
        <View style={styles.skeletonRow}>
          <Skeleton width={52} height={52} borderRadius={26} />
          <View style={styles.skeletonStack}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="45%" height={14} />
          </View>
        </View>
        <Skeleton width="100%" height={52} borderRadius={12} />
        <Skeleton width="100%" height={90} borderRadius={12} />
        <Skeleton width="100%" height={120} borderRadius={14} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  scrollContent: { paddingBottom: 120 },

  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  enquirerCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  enquirerInfo: { flex: 1 },
  enquirerName: { fontFamily: fonts.bold, fontSize: 18, color: colors.gray900, letterSpacing: -0.2 },
  enquirerContact: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, marginTop: 3 },
  enquirerEmail: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, marginTop: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  badge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  badgeText: { fontFamily: fonts.medium, fontSize: 12 },
  receivedText: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400 },

  block: { paddingHorizontal: 20, paddingTop: 20 },
  escrowNote: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.blue50,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  escrowNoteText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.blue800, lineHeight: 17 },

  messageBox: { backgroundColor: colors.gray50, borderRadius: 12, padding: 14, marginTop: 10 },
  messageText: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray700, lineHeight: 22 },
  prefersBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.blue50,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  prefersText: { fontFamily: fonts.medium, fontSize: 13, color: colors.blue800 },

  listingCard: { backgroundColor: colors.gray50, borderRadius: 14, overflow: 'hidden', marginTop: 10 },
  listingPhoto: { height: 80 },
  listingImage: { width: '100%', height: '100%' },
  listingPlaceholder: { flex: 1, backgroundColor: colors.blue50, alignItems: 'center', justifyContent: 'center' },
  listingBody: { padding: 12 },
  listingTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gray900 },
  listingPrice: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, marginTop: 3 },
  listingAgent: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginTop: 3 },
  listingMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  listingMetaText: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400, flexShrink: 1 },
  feeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successBg,
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  feeText: { flex: 1, fontFamily: fonts.medium, fontSize: 12, color: colors.successText },

  statusList: { gap: 8, marginTop: 10 },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray100,
    backgroundColor: colors.white,
  },
  statusOptionCurrent: { borderWidth: 1.5, borderColor: colors.blue600, backgroundColor: colors.blue50 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusTextWrap: { flex: 1 },
  statusLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gray900 },
  statusDesc: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 2 },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  bottomBtn: { flex: 1, height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  scheduleBtn: { backgroundColor: colors.blue600 },
  scheduleBtnText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  disabledBtn: { opacity: 0.5 },
  dateModalWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  dateBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  dateSheet: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 8 },
  dateHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.gray200, alignSelf: 'center', marginBottom: 8 },
  dateTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.gray900, paddingHorizontal: 4, marginBottom: 4 },
  dateDone: { backgroundColor: colors.blue600, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  dateDoneText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  notFoundTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.gray900, marginTop: 16 },
  notFoundBody: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, marginTop: 6, textAlign: 'center' },
  notFoundCta: {
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.blue600,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  notFoundCtaText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.blue600 },

  skeletonBody: { padding: 20, gap: 16 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  skeletonStack: { flex: 1, gap: 8 },
});
