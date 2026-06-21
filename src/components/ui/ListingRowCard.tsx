import { Image, Pressable, Text, View, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { formatPrice, frequencyLabel } from '@/utils/format';
import { getStatusBadgeStyle } from '@/utils/statusBadge';
import type { Listing } from '@/types/listings';

export interface ListingRowCardProps {
  listing: Listing;
  onPress: () => void;
  onMore: () => void;
}

// Horizontal listing card for the Listings index. See docs/denhunt-design-system.md.
export default function ListingRowCard({ listing, onPress, onMore }: ListingRowCardProps) {
  const status = getStatusBadgeStyle(listing.status);
  const freq = frequencyLabel(listing.payment_frequency);
  const location = [listing.area, listing.state].filter(Boolean).join(', ');

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Thumbnail */}
      <View style={styles.thumb}>
        {listing.cover_photo_url ? (
          <Image source={{ uri: listing.cover_photo_url }} style={styles.thumbImage} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Feather name="home" size={24} color={colors.blue600} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.row1}>
          <Text style={styles.title} numberOfLines={1}>
            {listing.title}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        {listing.posted_by_name ? (
          <Text style={styles.agentName}>By {listing.posted_by_name}</Text>
        ) : null}

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(listing.price)}</Text>
          {freq ? <Text style={styles.freq}>{freq}</Text> : null}
        </View>

        <View style={styles.metaRow}>
          {listing.bedrooms != null ? (
            <View style={styles.metaItem}>
              <Feather name="home" size={11} color={colors.gray400} />
              <Text style={styles.metaText}>{listing.bedrooms} bed</Text>
            </View>
          ) : null}
          {location ? (
            <View style={[styles.metaItem, styles.metaFlex]}>
              <Feather name="map-pin" size={11} color={colors.gray400} />
              <Text style={styles.metaText} numberOfLines={1}>
                {location}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.metaItem}>
            <Feather name="message-square" size={11} color={colors.gray400} />
            <Text style={styles.metaText}>{listing.enquiries_count} enquiries</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="eye" size={11} color={colors.gray400} />
            <Text style={styles.metaText}>{listing.views_count} views</Text>
          </View>
          <View style={styles.spacer} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Listing actions"
            hitSlop={8}
            onPress={onMore}>
            <Feather name="more-horizontal" size={18} color={colors.gray400} />
          </Pressable>
        </View>

        {listing.status === 'rejected' && listing.rejection_reason ? (
          <View style={styles.rejection}>
            <Feather name="alert-circle" size={12} color={colors.errorText} />
            <Text style={styles.rejectionText} numberOfLines={2}>
              {listing.rejection_reason}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  thumb: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  thumbPlaceholder: {
    flex: 1,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  row1: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.gray900 },
  statusPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  statusText: { fontFamily: fonts.medium, fontSize: 12 },
  agentName: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 3 },
  price: { fontFamily: fonts.bold, fontSize: 15, color: colors.gray900 },
  freq: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginLeft: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 3 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaFlex: { flexShrink: 1 },
  metaText: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  spacer: { flex: 1 },
  rejection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: colors.errorBg,
    borderRadius: 8,
    padding: 8,
  },
  rejectionText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, color: colors.errorText },
});
