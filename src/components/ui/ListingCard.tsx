import { Image, Pressable, Text, View, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { router, type Href } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import type { RecentListing } from '@/hooks/useDashboardData';

export interface ListingCardProps {
  listing: RecentListing;
  showAgentName?: boolean;
}

const FREQUENCY_LABEL: Record<string, string> = {
  per_annum: '/yr',
  per_month: '/mo',
  per_night: '/night',
  outright: '',
};

const STATUS_META: Record<string, { bg: string; fg: string; label: string }> = {
  active: { bg: colors.blue50, fg: colors.blue600, label: 'Active' },
  pending_review: { bg: colors.warningBg, fg: colors.warningText, label: 'Pending' },
  paused: { bg: colors.gray100, fg: colors.gray500, label: 'Paused' },
  draft: { bg: colors.gray100, fg: colors.gray500, label: 'Draft' },
  rented_sold: { bg: colors.successBg, fg: colors.successText, label: 'Rented/Sold' },
  rejected: { bg: colors.errorBg, fg: colors.errorText, label: 'Rejected' },
  expired: { bg: colors.gray100, fg: colors.gray500, label: 'Expired' },
};

function formatPrice(price: number): string {
  return `₦${price.toLocaleString('en-NG')}`;
}

// Compact listing card for dashboard / lists. See docs/denhunt-design-system.md.
export default function ListingCard({ listing, showAgentName = false }: ListingCardProps) {
  const status = STATUS_META[listing.status] ?? STATUS_META.draft;
  const freq = FREQUENCY_LABEL[listing.payment_frequency] ?? '';
  const location = [listing.area, listing.state].filter(Boolean).join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      style={styles.card}
      onPress={() => router.push(`/(agent)/listings/${listing.id}` as Href)}>
      <View style={styles.imageArea}>
        {listing.cover_photo_url ? (
          <Image source={{ uri: listing.cover_photo_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Feather name="home" size={28} color={colors.blue200} />
          </View>
        )}
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(listing.price)}</Text>
          {freq ? <Text style={styles.freq}>{freq}</Text> : null}
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>

        <View style={styles.metaRow}>
          {location ? (
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={12} color={colors.gray400} />
              <Text style={styles.metaText} numberOfLines={1}>
                {location}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Feather name="message-square" size={12} color={colors.gray400} />
            <Text style={styles.metaText}>{listing.enquiries_count}</Text>
          </View>
        </View>

        {showAgentName && listing.agent_name ? (
          <Text style={styles.agentName}>by {listing.agent_name}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray100,
    backgroundColor: colors.white,
    marginBottom: 12,
  },
  imageArea: { height: 130, backgroundColor: colors.blue50 },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusText: { fontFamily: fonts.medium, fontSize: 12 },
  body: { paddingVertical: 12, paddingHorizontal: 14 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  price: { fontFamily: fonts.bold, fontSize: 18, color: colors.gray900, letterSpacing: -0.2 },
  freq: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500 },
  title: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray700, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  metaText: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400 },
  agentName: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400, marginTop: 6 },
});
