import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Avatar, SectionLabel, Skeleton } from '@/components/ui';
import { formatDate, formatPrice, formatRelativeDate, paymentPeriod, toWhatsappNumber } from '@/utils/format';
import { getEnquiryStatusBadge, ENQUIRY_DOT } from '@/utils/statusBadge';
import { useEnquiryDetail } from '@/hooks/useEnquiryDetail';
import { supabase } from '@/lib/supabase';
import type { EnquiryStatus } from '@/types/enquiries';

// One-off brand colour — not in design system palette.
const WHATSAPP_GREEN = '#25D366';

const ENQUIRIES_HREF = '/(agent)/enquiries' as Href;

const STATUS_OPTIONS: { value: EnquiryStatus; label: string; desc: string }[] = [
  { value: 'new', label: 'New', desc: 'Not yet responded to' },
  { value: 'contacted', label: 'Contacted', desc: "You've been in touch" },
  { value: 'inspection_scheduled', label: 'Inspection scheduled', desc: 'Inspection date agreed' },
  { value: 'closed', label: 'Closed', desc: 'Deal completed' },
  { value: 'not_interested', label: 'Not interested', desc: 'Renter no longer interested' },
];

async function openLink(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Couldn't open", 'Please try manually.');
  }
}

export default function EnquiryDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { enquiry, listing, loading, error, refetch } = useEnquiryDetail(id);

  function backToInbox() {
    router.push(ENQUIRIES_HREF);
  }

  function callPhone() {
    if (enquiry) openLink(`tel:${enquiry.enquirer_phone}`);
  }

  function whatsapp() {
    if (!enquiry) return;
    const text = encodeURIComponent(
      `Hi ${enquiry.enquirer_name}, I'm reaching out about your enquiry for ${listing?.title ?? 'your enquiry'} on DenHunt.`,
    );
    openLink(`whatsapp://send?phone=${toWhatsappNumber(enquiry.enquirer_phone)}&text=${text}`);
  }

  function email() {
    if (!enquiry) return;
    if (!enquiry.enquirer_email) {
      Alert.alert('No email address provided');
      return;
    }
    openLink(
      `mailto:${enquiry.enquirer_email}?subject=${encodeURIComponent(`Re: ${listing?.title ?? 'your enquiry'} on DenHunt`)}`,
    );
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

        {/* SECTION 2 — contact actions */}
        <View style={styles.block}>
          <SectionLabel text="Contact" />
          <View style={styles.contactRow}>
            <Pressable style={[styles.contactBtn, styles.contactGreen]} onPress={callPhone}>
              <Feather name="phone" size={20} color={colors.successText} />
              <Text style={styles.contactGreenText}>Call</Text>
            </Pressable>
            <Pressable style={[styles.contactBtn, styles.contactGreen]} onPress={whatsapp}>
              <Feather name="message-circle" size={20} color={colors.successText} />
              <Text style={styles.contactGreenText}>WhatsApp</Text>
            </Pressable>
            <Pressable
              style={[styles.contactBtn, enquiry.enquirer_email ? styles.contactBlue : styles.contactDisabled]}
              onPress={email}>
              <Feather name="mail" size={20} color={enquiry.enquirer_email ? colors.blue600 : colors.gray400} />
              <Text style={enquiry.enquirer_email ? styles.contactBlueText : styles.contactDisabledText}>
                Email
              </Text>
            </Pressable>
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
        <Pressable style={[styles.bottomBtn, styles.callBtn]} onPress={callPhone}>
          <Feather name="phone" size={16} color={colors.blue600} />
          <Text style={styles.callBtnText}>Call now</Text>
        </Pressable>
        <Pressable style={[styles.bottomBtn, styles.waBtn]} onPress={whatsapp}>
          <Feather name="message-circle" size={16} color={colors.white} />
          <Text style={styles.waBtnText}>WhatsApp</Text>
        </Pressable>
      </View>
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
  contactRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  contactBtn: { flex: 1, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 5 },
  contactGreen: { backgroundColor: colors.successBg },
  contactGreenText: { fontFamily: fonts.medium, fontSize: 12, color: colors.successText },
  contactBlue: { backgroundColor: colors.blue50 },
  contactBlueText: { fontFamily: fonts.medium, fontSize: 12, color: colors.blue600 },
  contactDisabled: { backgroundColor: colors.gray50 },
  contactDisabledText: { fontFamily: fonts.medium, fontSize: 12, color: colors.gray400 },

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
  callBtn: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.blue600 },
  callBtnText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.blue600 },
  waBtn: { backgroundColor: WHATSAPP_GREEN },
  waBtnText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },

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
