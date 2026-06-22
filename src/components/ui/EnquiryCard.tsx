import { Pressable, Text, View, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Avatar } from './Avatar';
import { formatDate, formatPrice, formatRelativeDate } from '@/utils/format';
import { getEnquiryStatusBadge } from '@/utils/statusBadge';
import type { Enquiry, EnquiryStatus } from '@/types/enquiries';

export interface EnquiryCardProps {
  enquiry: Enquiry;
  onPress: () => void;
  onStatusChange: (id: string, status: EnquiryStatus) => void;
}

const ACCENT: Record<EnquiryStatus, string> = {
  new: colors.blue600,
  contacted: colors.warningText,
  inspection_scheduled: colors.successText,
  closed: colors.gray400,
  not_interested: colors.gray200,
};

// Enquiry summary card for the inbox. See docs/denhunt-design-system.md.
export default function EnquiryCard({ enquiry, onPress, onStatusChange }: EnquiryCardProps) {
  const badge = getEnquiryStatusBadge(enquiry.status);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.accent, { backgroundColor: ACCENT[enquiry.status] }]} />
      <View style={styles.content}>
        {/* Row 1 */}
        <View style={styles.row1}>
          <Avatar name={enquiry.enquirer_name} size={38} />
          <View style={styles.who}>
            <Text style={styles.name} numberOfLines={1}>
              {enquiry.enquirer_name}
            </Text>
            <Text style={styles.phone}>{enquiry.enquirer_phone}</Text>
          </View>
          <View style={styles.rightCol}>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
            <Text style={styles.time}>{formatRelativeDate(enquiry.created_at)}</Text>
          </View>
        </View>

        {/* Row 2 — listing context */}
        <View style={styles.listingRow}>
          <Feather name="home" size={12} color={colors.gray400} />
          <Text style={styles.listingTitle} numberOfLines={1}>
            {enquiry.listing_title ?? 'Listing'}
          </Text>
          {enquiry.listing_price != null ? (
            <Text style={styles.listingPrice}>{formatPrice(enquiry.listing_price)}</Text>
          ) : null}
        </View>
        {enquiry.listing_agent_name ? (
          <Text style={styles.agentName}>Listing by {enquiry.listing_agent_name}</Text>
        ) : null}

        {/* Row 3 — message */}
        {enquiry.message ? (
          <View style={styles.messageRow}>
            <Feather name="message-square" size={11} color={colors.gray400} />
            <Text style={styles.message} numberOfLines={2}>
              {enquiry.message}
            </Text>
          </View>
        ) : null}

        {/* Row 4 — preferred date + quick actions */}
        <View style={styles.actionRow}>
          {enquiry.preferred_inspection_date ? (
            <View style={styles.prefersWrap}>
              <Feather name="calendar" size={11} color={colors.gray400} />
              <Text style={styles.prefers}>
                Prefers {formatDate(enquiry.preferred_inspection_date)}
              </Text>
            </View>
          ) : null}
          <View style={styles.spacer} />
          {enquiry.status === 'new' ? (
            <Pressable
              style={styles.markPill}
              onPress={() => onStatusChange(enquiry.id, 'contacted')}>
              <Text style={styles.markPillText}>Mark contacted</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  content: { paddingVertical: 14, paddingLeft: 17, paddingRight: 14 },
  row1: { flexDirection: 'row', alignItems: 'flex-start' },
  who: { flex: 1, marginLeft: 10 },
  name: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gray900 },
  phone: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 1 },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  badgeText: { fontFamily: fonts.medium, fontSize: 12 },
  time: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400 },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: colors.gray50,
    borderRadius: 8,
    padding: 8,
  },
  listingTitle: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.gray700 },
  listingPrice: { fontFamily: fonts.medium, fontSize: 12, color: colors.blue600 },
  agentName: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginTop: 4 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  message: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginLeft: 5 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  prefersWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prefers: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray500 },
  spacer: { flex: 1 },
  markPill: {
    backgroundColor: colors.blue50,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markPillText: { fontFamily: fonts.medium, fontSize: 11, color: colors.blue600 },
});
