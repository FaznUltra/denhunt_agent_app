import { useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Avatar, SectionLabel, Skeleton } from '@/components/ui';
import {
  amenityLabel,
  capitalizeWords,
  formatDate,
  formatPrice,
  formatRelativeDate,
  paymentPeriod,
} from '@/utils/format';
import { getStatusBadgeStyle } from '@/utils/statusBadge';
import { useListingDetail } from '@/hooks/useListingDetail';
import { supabase } from '@/lib/supabase';
import { duplicateListing } from '@/utils/duplicateListing';
import type { ListingMedia } from '@/types/listings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_HEIGHT = 280;
const LISTINGS_HREF = '/(agent)/listings' as Href;

function purposeLabel(purpose: string): string {
  switch (purpose) {
    case 'rent':
      return 'For Rent';
    case 'sale':
      return 'For Sale';
    case 'shortlet':
      return 'Short-let';
    default:
      return capitalizeWords(purpose) || '–';
  }
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function VideoGalleryItem({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={styles.galleryItem}
      contentFit="contain"
      nativeControls
      allowsFullscreen
    />
  );
}

function GalleryItem({ item }: { item: ListingMedia }) {
  if (item.type === 'video') return <VideoGalleryItem uri={item.url} />;
  return <Image source={{ uri: item.url }} style={styles.galleryItem} resizeMode="cover" />;
}

function StatItem({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statItem}>
      <Feather name={icon} size={16} color={colors.gray400} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ListingDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { listing, media, recentEnquiries, loading, error, refetch } = useListingDetail(id);
  const [page, setPage] = useState(0);

  function backToListings() {
    router.push(LISTINGS_HREF);
  }

  function goEdit() {
    router.push(`/(agent)/listings/${id}/edit` as Href);
  }

  async function handleShare() {
    if (!listing) return;
    try {
      await Share.share({
        message: `Check out this listing on DenHunt: ${listing.title}`,
        url: `https://denhunt.com/listings/${id}`,
      });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

  async function updateStatus(status: 'active' | 'paused') {
    try {
      const { error: updErr } = await supabase.from('listings').update({ status }).eq('id', id);
      if (updErr) throw new Error(updErr.message);
      await refetch();
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete listing',
      'This listing and all its photos will be permanently deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('listing_media').delete().eq('listing_id', id);
              const { error: delErr } = await supabase.from('listings').delete().eq('id', id);
              if (delErr) throw new Error(delErr.message);
              backToListings();
            } catch (e) {
              Alert.alert('Could not delete', e instanceof Error ? e.message : 'Please try again.');
            }
          },
        },
      ],
    );
  }

  async function handleRelist() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const newId = await duplicateListing(id, user.id, supabase);
      router.push(`/(agent)/listings/${newId}/edit` as Href);
    } catch (e) {
      Alert.alert('Could not relist', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  function onGalleryScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
  }

  if (loading) return <DetailSkeleton />;
  if (error) {
    return (
      <DetailMessage
        title="Couldn't load listing"
        body="Check your connection and try again."
        ctaLabel="Retry"
        onCta={refetch}
      />
    );
  }
  if (!listing) {
    return (
      <DetailMessage
        title="Listing not found"
        body="This listing may have been deleted."
        ctaLabel="Back to listings"
        onCta={backToListings}
      />
    );
  }

  const badge = getStatusBadgeStyle(listing.status);
  const status = listing.status;
  const location =
    listing.show_exact_address && listing.street_address
      ? [listing.street_address, listing.area, listing.state].filter(Boolean).join(', ')
      : [listing.area, listing.state].filter(Boolean).join(', ');

  const statusBarAction =
    status === 'pending_review'
      ? null
      : status === 'rented_sold' || status === 'expired'
        ? { label: 'Relist', onPress: handleRelist }
        : { label: 'Edit listing', onPress: goEdit };

  const leftAction =
    status === 'active'
      ? { label: 'Pause', danger: false, onPress: () => updateStatus('paused') }
      : status === 'paused'
        ? { label: 'Resume', danger: false, onPress: () => updateStatus('active') }
        : status === 'draft' || status === 'rejected'
          ? { label: 'Delete', danger: true, onPress: confirmDelete }
          : status === 'rented_sold' || status === 'expired'
            ? { label: 'Relist', danger: false, onPress: handleRelist }
            : null;
  const rightLabel =
    status === 'draft'
      ? 'Continue editing'
      : status === 'rejected'
        ? 'Edit & resubmit'
        : status === 'pending_review'
          ? 'View details only'
          : 'Edit listing';
  const rightDisabled = status === 'pending_review';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* SECTION 1 — gallery */}
        <View style={styles.gallery}>
          {media.length > 0 ? (
            <>
              <FlatList
                data={media}
                keyExtractor={(m) => m.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onGalleryScroll}
                renderItem={({ item }) => <GalleryItem item={item} />}
              />
              {media.length > 1 ? (
                <View style={styles.pageIndicator}>
                  <Text style={styles.pageIndicatorText}>
                    {page + 1} / {media.length}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.galleryEmpty}>
              <Feather name="home" size={48} color={colors.blue600} />
              <Text style={styles.galleryEmptyText}>No photos added</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to listings"
            style={[styles.overlayButton, styles.overlayLeft]}
            onPress={backToListings}>
            <Feather name="arrow-left" size={20} color={colors.gray900} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share"
            style={[styles.overlayButton, styles.overlayRight]}
            onPress={handleShare}>
            <Feather name="share-2" size={20} color={colors.gray900} />
          </Pressable>
        </View>

        {/* SECTION 2 — status bar */}
        <View style={styles.statusBar}>
          <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusPillText, { color: badge.text }]}>{badge.label}</Text>
          </View>
          {statusBarAction ? (
            <Pressable style={styles.smallButton} onPress={statusBarAction.onPress}>
              <Text style={styles.smallButtonText}>{statusBarAction.label}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* SECTION 3 — price & title */}
        <View style={styles.priceTitle}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(listing.price)}</Text>
            <Text style={styles.priceFreq}>/{paymentPeriod(listing.payment_frequency)}</Text>
            {listing.price_negotiable ? <Text style={styles.negotiable}> · Negotiable</Text> : null}
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          {location ? (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={13} color={colors.gray400} />
              <Text style={styles.locationText}>{location}</Text>
            </View>
          ) : null}
          <View style={styles.postedRow}>
            <Feather name="clock" size={11} color={colors.gray400} />
            <Text style={styles.postedText}>Listed {formatRelativeDate(listing.created_at)}</Text>
          </View>
        </View>

        {/* SECTION 4 — quick stats */}
        <View style={styles.statsRow}>
          <StatItem icon="eye" value={String(listing.views_count)} label="views" />
          <StatItem icon="message-square" value={String(listing.enquiries_count)} label="enquiries" />
          <StatItem icon="home" value={listing.bedrooms != null ? String(listing.bedrooms) : '–'} label="beds" />
          <StatItem icon="droplet" value={listing.bathrooms != null ? String(listing.bathrooms) : '–'} label="baths" />
        </View>

        {/* SECTION 5 — property details */}
        <View style={styles.block}>
          <SectionLabel text="Property details" />
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <DetailCell label="Type" value={capitalizeWords(listing.category) || '–'} />
              <DetailCell label="Purpose" value={purposeLabel(listing.purpose)} />
            </View>
            <View style={styles.detailRow}>
              <DetailCell label="Furnishing" value={listing.furnishing ? capitalizeWords(listing.furnishing) : '–'} />
              <DetailCell label="Floor" value={listing.floor ?? '–'} />
            </View>
            <View style={styles.detailRow}>
              <DetailCell label="Size" value={listing.size_sqm ? `${listing.size_sqm} sqm` : '–'} />
              <DetailCell label="Year built" value={listing.year_built ? String(listing.year_built) : '–'} />
            </View>
            <View style={styles.detailRow}>
              <DetailCell label="Parking" value={listing.parking ?? '–'} />
              <DetailCell
                label="Land size"
                value={listing.category === 'land' ? (listing.land_size ?? '–') : '–'}
              />
            </View>
            <View style={styles.detailRow}>
              <DetailCell label="Available from" value={listing.available_from ? formatDate(listing.available_from) : '–'} />
              <DetailCell label="Occupancy" value={listing.occupancy_status ? capitalizeWords(listing.occupancy_status) : '–'} />
            </View>
            <View style={styles.detailRow}>
              <DetailCell label="Caution fee" value={listing.caution_fee ?? '–'} />
              <DetailCell label="Agency fee" value={listing.agency_fee ?? '–'} />
            </View>
            {listing.service_charge ? (
              <Text style={styles.serviceCharge}>Service charge: {formatPrice(listing.service_charge)}</Text>
            ) : null}
          </View>
        </View>

        {/* SECTION 6 — description */}
        {listing.description ? (
          <View style={styles.block}>
            <SectionLabel text="Description" />
            <Text style={styles.description}>{listing.description}</Text>
          </View>
        ) : null}

        {/* SECTION 7 — amenities */}
        {listing.amenities.length > 0 ? (
          <View style={styles.block}>
            <SectionLabel text="Amenities" />
            <View style={styles.amenityWrap}>
              {listing.amenities.map((a) => (
                <View key={a} style={styles.amenityChip}>
                  <Text style={styles.amenityText}>{amenityLabel(a)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* SECTION 8 — recent enquiries */}
        {recentEnquiries.length > 0 ? (
          <View style={styles.block}>
            <SectionLabel text="Recent enquiries" />
            <View style={styles.enquiryList}>
              {recentEnquiries.map((e) => (
                <View key={e.id} style={styles.enquiryRow}>
                  <Avatar name={e.enquirer_name} size={32} />
                  <View style={styles.enquiryContent}>
                    <Text style={styles.enquiryName}>{e.enquirer_name}</Text>
                    {e.message ? (
                      <Text style={styles.enquiryMessage} numberOfLines={1}>
                        {e.message}
                      </Text>
                    ) : null}
                    <Text style={styles.enquiryDate}>{formatRelativeDate(e.created_at)}</Text>
                  </View>
                  <View style={styles.enquiryStatus}>
                    <Text style={styles.enquiryStatusText}>{capitalizeWords(e.status)}</Text>
                  </View>
                </View>
              ))}
            </View>
            {listing.enquiries_count > 3 ? (
              <Pressable onPress={() => router.push(`/(agent)/enquiries?listingId=${id}` as Href)}>
                <Text style={styles.seeAllEnquiries}>
                  See all {listing.enquiries_count} enquiries →
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* SECTION 9 — inspection fee */}
        <View style={styles.block}>
          <SectionLabel text="Inspection" />
          <View style={styles.inspectionCard}>
            <Feather name="shield" size={20} color={colors.blue600} />
            <View style={styles.inspectionContent}>
              <Text style={styles.inspectionTitle}>Inspection fee</Text>
              {listing.inspection_fee ? (
                <>
                  <Text style={styles.inspectionFee}>{formatPrice(listing.inspection_fee)}</Text>
                  <Text style={styles.inspectionSub}>
                    Held in escrow · Released after successful inspection
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.inspectionNotSet}>Not set</Text>
                  <Text style={styles.inspectionSetLink} onPress={goEdit}>
                    Set in listing settings
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {leftAction ? (
          <Pressable
            style={[styles.bottomButton, leftAction.danger ? styles.bottomDanger : styles.bottomSecondary]}
            onPress={leftAction.onPress}>
            <Text style={leftAction.danger ? styles.bottomDangerText : styles.bottomSecondaryText}>
              {leftAction.label}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          disabled={rightDisabled}
          style={[styles.bottomButton, styles.bottomPrimary, rightDisabled && styles.bottomDisabled]}
          onPress={goEdit}>
          <Text style={styles.bottomPrimaryText}>{rightLabel}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function DetailSkeleton() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Skeleton width="100%" height={GALLERY_HEIGHT} borderRadius={0} />
      <View style={styles.skeletonBody}>
        <Skeleton width="60%" height={18} />
        <Skeleton width="90%" height={14} />
        <Skeleton width="50%" height={12} />
      </View>
      <View style={styles.skeletonStats}>
        <Skeleton width="100%" height={60} borderRadius={12} />
      </View>
      <View style={styles.skeletonBody}>
        <Skeleton width="40%" height={12} />
        <Skeleton width="100%" height={80} borderRadius={12} />
      </View>
    </SafeAreaView>
  );
}

function DetailMessage({
  title,
  body,
  ctaLabel,
  onCta,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.messageWrap}>
        <Feather name="alert-circle" size={40} color={colors.gray400} />
        <Text style={styles.messageTitle}>{title}</Text>
        <Text style={styles.messageBody}>{body}</Text>
        <Pressable style={styles.messageCta} onPress={onCta}>
          <Text style={styles.messageCtaText}>{ctaLabel}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  scrollContent: { paddingBottom: 120 },

  gallery: { height: GALLERY_HEIGHT, width: '100%' },
  galleryItem: { width: SCREEN_WIDTH, height: GALLERY_HEIGHT, backgroundColor: colors.gray900 },
  galleryEmpty: { flex: 1, backgroundColor: colors.blue50, alignItems: 'center', justifyContent: 'center' },
  galleryEmptyText: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, marginTop: 8 },
  pageIndicator: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  pageIndicatorText: { fontFamily: fonts.medium, fontSize: 12, color: colors.white },
  overlayButton: {
    position: 'absolute',
    top: 12,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayLeft: { left: 16 },
  overlayRight: { right: 16 },

  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  statusPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  statusPillText: { fontFamily: fonts.medium, fontSize: 12 },
  smallButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.blue600,
    backgroundColor: colors.white,
  },
  smallButtonText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.blue600 },

  priceTitle: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontFamily: fonts.bold, fontSize: 26, color: colors.gray900, letterSpacing: -0.3 },
  priceFreq: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, marginLeft: 2 },
  negotiable: { fontFamily: fonts.regular, fontSize: 13, color: colors.successText },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.gray900, lineHeight: 22, marginTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  locationText: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, flexShrink: 1 },
  postedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  postedText: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400 },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontFamily: fonts.bold, fontSize: 15, color: colors.gray900, marginTop: 4 },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginTop: 1 },

  block: { paddingHorizontal: 20, paddingTop: 20 },
  detailsGrid: { marginTop: 12 },
  detailRow: { flexDirection: 'row', marginBottom: 12 },
  detailCell: { flex: 1 },
  detailLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray900 },
  serviceCharge: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray900, marginTop: 2 },

  description: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray700, lineHeight: 22, marginTop: 10 },

  amenityWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  amenityChip: { backgroundColor: colors.gray50, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  amenityText: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray700 },

  enquiryList: { marginTop: 10 },
  enquiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  enquiryContent: { flex: 1 },
  enquiryName: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gray900 },
  enquiryMessage: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 2 },
  enquiryDate: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginTop: 2 },
  enquiryStatus: { backgroundColor: colors.blue50, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  enquiryStatusText: { fontFamily: fonts.medium, fontSize: 11, color: colors.blue600 },
  seeAllEnquiries: { fontFamily: fonts.medium, fontSize: 13, color: colors.blue600, marginTop: 8 },

  inspectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  inspectionContent: { flex: 1 },
  inspectionTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gray900 },
  inspectionFee: { fontFamily: fonts.bold, fontSize: 15, color: colors.blue600, marginTop: 2 },
  inspectionSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray500, marginTop: 2 },
  inspectionNotSet: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray400, marginTop: 2 },
  inspectionSetLink: { fontFamily: fonts.regular, fontSize: 11, color: colors.blue600, marginTop: 2 },

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
  bottomButton: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  bottomSecondary: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.blue600 },
  bottomSecondaryText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.blue600 },
  bottomDanger: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.errorText },
  bottomDangerText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.errorText },
  bottomPrimary: { backgroundColor: colors.blue600 },
  bottomPrimaryText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  bottomDisabled: { opacity: 0.5 },

  skeletonBody: { paddingHorizontal: 20, gap: 8, marginTop: 16 },
  skeletonStats: { paddingHorizontal: 20, marginTop: 16 },

  messageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  messageTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.gray900, marginTop: 16 },
  messageBody: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, marginTop: 6, textAlign: 'center' },
  messageCta: {
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.blue600,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  messageCtaText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.blue600 },
});
