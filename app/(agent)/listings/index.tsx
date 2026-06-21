import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router, type Href } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { EmptyState, ListingRowCard, Skeleton } from '@/components/ui';
import { useListings, type ListingFilter, type SortOrder } from '@/hooks/useListings';
import type { Listing } from '@/types/listings';
import { supabase } from '@/lib/supabase';
import { duplicateListing } from '@/utils/duplicateListing';

type SheetKind = 'sort' | 'action' | null;
type ActionRow = { label: string; icon: keyof typeof Feather.glyphMap; danger?: boolean; onPress: () => void };

const FILTERS: { label: string; value: ListingFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending_review' },
  { label: 'Drafts', value: 'draft' },
  { label: 'Paused', value: 'paused' },
  { label: 'Sold/Rented', value: 'rented_sold' },
];

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most_enquiries', label: 'Most enquiries' },
  { value: 'most_views', label: 'Most views' },
  { value: 'price_high', label: 'Price: high to low' },
  { value: 'price_low', label: 'Price: low to high' },
];

const FILTER_LABEL: Record<string, string> = {
  active: 'active',
  pending_review: 'pending',
  draft: 'draft',
  paused: 'paused',
  rented_sold: 'sold/rented',
};

export default function ListingsScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<ListingFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [activeSheet, setActiveSheet] = useState<SheetKind>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { listings, loading, error, refetch, counts, isAgencyAdmin } = useListings(activeFilter, sortOrder);
  const selectedListing = useMemo(
    () => listings.find((l) => l.id === selectedListingId) ?? null,
    [listings, selectedListingId],
  );

  function closeSheet() {
    setActiveSheet(null);
    setSelectedListingId(null);
  }

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function goDetail(id: string) {
    router.push(`/(agent)/listings/${id}` as Href);
  }

  function goEdit(id: string) {
    router.push(`/(agent)/listings/${id}/edit` as Href);
  }

  async function handleQuickAction(action: 'pause' | 'resume' | 'rented_sold' | 'delete', id: string) {
    try {
      if (action === 'delete') {
        const { error: mediaErr } = await supabase.from('listing_media').delete().eq('listing_id', id);
        if (mediaErr) throw new Error(mediaErr.message);
        const { error: listErr } = await supabase.from('listings').delete().eq('id', id);
        if (listErr) throw new Error(listErr.message);
      } else {
        const status = action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'rented_sold';
        const { error: updErr } = await supabase.from('listings').update({ status }).eq('id', id);
        if (updErr) throw new Error(updErr.message);
      }
      await refetch();
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  function confirmDelete(id: string) {
    Alert.alert(
      'Delete listing',
      'This listing and all its photos will be permanently deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleQuickAction('delete', id) },
      ],
    );
  }

  async function handleRelist(listing: Listing) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const newId = await duplicateListing(listing.id, user.id, supabase);
      await refetch();
      goEdit(newId);
    } catch (e) {
      Alert.alert('Could not relist', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  // Build the action rows for the selected listing based on its status.
  function actionRowsFor(listing: Listing): ActionRow[] {
    const id = listing.id;
    const edit: ActionRow = { label: 'Edit listing', icon: 'edit-2', onPress: () => { closeSheet(); goEdit(id); } };
    const del: ActionRow = { label: 'Delete listing', icon: 'trash-2', danger: true, onPress: () => { closeSheet(); confirmDelete(id); } };

    switch (listing.status) {
      case 'active':
        return [
          edit,
          { label: 'Pause listing', icon: 'pause', onPress: () => { closeSheet(); handleQuickAction('pause', id); } },
          { label: 'Mark as rented/sold', icon: 'check-circle', onPress: () => { closeSheet(); handleQuickAction('rented_sold', id); } },
          del,
        ];
      case 'draft':
        return [
          { label: 'Continue editing', icon: 'edit-2', onPress: () => { closeSheet(); goEdit(id); } },
          { label: 'Delete draft', icon: 'trash-2', danger: true, onPress: () => { closeSheet(); confirmDelete(id); } },
        ];
      case 'paused':
        return [
          { label: 'Resume listing', icon: 'play', onPress: () => { closeSheet(); handleQuickAction('resume', id); } },
          edit,
          del,
        ];
      case 'pending_review':
        return [{ label: 'View submission', icon: 'eye', onPress: () => { closeSheet(); goDetail(id); } }];
      case 'rejected':
        return [
          { label: 'Edit and resubmit', icon: 'edit-2', onPress: () => { closeSheet(); goEdit(id); } },
          del,
        ];
      case 'rented_sold':
      case 'expired':
        return [
          { label: 'Relist property', icon: 'refresh-cw', onPress: () => { closeSheet(); handleRelist(listing); } },
          del,
        ];
      default:
        return [del];
    }
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{isAgencyAdmin ? 'Agency listings' : 'My listings'}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sort"
          style={styles.sortButton}
          onPress={() => setActiveSheet('sort')}>
          <Feather name="sliders" size={18} color={colors.gray500} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = activeFilter === f.value;
          const count = counts[f.value as keyof typeof counts];
          return (
            <Pressable
              key={f.value}
              style={[styles.filterPill, active ? styles.filterPillActive : styles.filterPillInactive]}
              onPress={() => setActiveFilter(f.value)}>
              <Text style={active ? styles.filterTextActive : styles.filterTextInactive}>
                {f.label}
                {count > 0 ? (
                  <Text style={active ? styles.filterCountActive : styles.filterCountInactive}>
                    {' '}
                    {count}
                  </Text>
                ) : null}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const empty = loading ? (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={88} borderRadius={16} />
      <Skeleton width="100%" height={88} borderRadius={16} />
      <Skeleton width="100%" height={88} borderRadius={16} />
    </View>
  ) : error ? (
    <EmptyState
      icon="wifi-off"
      title="Couldn't load listings"
      body={error}
      ctaLabel="Retry"
      onCta={refetch}
    />
  ) : activeFilter === 'all' ? (
    <EmptyState
      icon="home"
      title="No listings yet"
      body="Post your first listing and start receiving enquiries."
      ctaLabel="Post a listing"
      onCta={() => router.push('/(agent)/listings/create' as Href)}
    />
  ) : (
    <EmptyState
      icon="filter"
      title={`No ${FILTER_LABEL[activeFilter] ?? ''} listings`}
      body="Post a new listing, or view all of your listings."
      ctaLabel="Post a listing"
      onCta={() => router.push('/(agent)/listings/create' as Href)}
      secondaryLabel="View all listings"
      onSecondary={() => setActiveFilter('all')}
    />
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListingRowCard
            listing={item}
            onPress={() => goDetail(item.id)}
            onMore={() => {
              setSelectedListingId(item.id);
              setActiveSheet('action');
            }}
          />
        )}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* Sort bottom sheet */}
      <Modal
        visible={activeSheet === 'sort'}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}>
        <Pressable style={styles.backdrop} onPress={closeSheet}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Sort listings</Text>
            {SORT_OPTIONS.map((opt, i) => {
              const active = sortOrder === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.sortRow, i < SORT_OPTIONS.length - 1 && styles.rowDivider]}
                  onPress={() => {
                    setSortOrder(opt.value);
                    closeSheet();
                  }}>
                  <Text style={active ? styles.sortLabelActive : styles.sortLabel}>{opt.label}</Text>
                  {active ? <Feather name="check" size={16} color={colors.blue600} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Quick action bottom sheet */}
      <Modal
        visible={activeSheet === 'action' && !!selectedListing}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}>
        <Pressable style={styles.backdrop} onPress={closeSheet}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.handle} />
            {selectedListing
              ? actionRowsFor(selectedListing).map((row, i, arr) => (
                  <Pressable
                    key={row.label}
                    style={[styles.actionRow, i < arr.length - 1 && styles.rowDivider]}
                    onPress={row.onPress}>
                    <Feather
                      name={row.icon}
                      size={20}
                      color={row.danger ? colors.errorText : colors.gray900}
                    />
                    <Text style={[styles.actionLabel, row.danger && styles.actionLabelDanger]}>
                      {row.label}
                    </Text>
                  </Pressable>
                ))
              : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray50 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { paddingTop: 16 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.gray900, letterSpacing: -0.3 },
  sortButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: { gap: 8, paddingBottom: 12 },
  filterPill: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20 },
  filterPillInactive: { backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200 },
  filterPillActive: { backgroundColor: colors.blue600, borderWidth: 1.5, borderColor: colors.blue600 },
  filterTextInactive: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray500 },
  filterTextActive: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },
  filterCountInactive: { color: colors.gray400 },
  filterCountActive: { color: colors.white },
  separator: { height: 10 },
  skeletonWrap: { gap: 10, paddingTop: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray200,
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.gray900,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  sortLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray900 },
  sortLabelActive: { fontFamily: fonts.semibold, fontSize: 14, color: colors.blue600 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.gray900 },
  actionLabelDanger: { color: colors.errorText },
});
