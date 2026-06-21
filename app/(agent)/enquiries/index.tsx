import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { EnquiryCard, EmptyState, Skeleton } from '@/components/ui';
import { useEnquiries, type EnquiryCounts, type EnquiryFilter } from '@/hooks/useEnquiries';
import { supabase } from '@/lib/supabase';
import type { EnquiryStatus } from '@/types/enquiries';

const FILTERS: { label: string; value: EnquiryFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Inspection', value: 'inspection_scheduled' },
  { label: 'Closed', value: 'closed' },
  { label: 'Not interested', value: 'not_interested' },
];

const FILTER_LABEL: Record<string, string> = {
  new: 'new',
  contacted: 'contacted',
  inspection_scheduled: 'inspection',
  closed: 'closed',
  not_interested: 'not interested',
};

export default function EnquiriesScreen() {
  const params = useLocalSearchParams<{ listingId?: string }>();
  const [listingFilter, setListingFilter] = useState<string | null>(params.listingId ?? null);
  const [statusFilter, setStatusFilter] = useState<EnquiryFilter>('all');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const searchHeight = useRef(new Animated.Value(0)).current;

  const { enquiries, loading, error, counts, refetch } = useEnquiries(
    statusFilter,
    listingFilter ?? undefined,
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enquiries;
    return enquiries.filter(
      (e) =>
        e.enquirer_name.toLowerCase().includes(q) ||
        e.enquirer_phone.toLowerCase().includes(q) ||
        (e.listing_title ?? '').toLowerCase().includes(q),
    );
  }, [enquiries, search]);

  function toggleSearch() {
    const next = !searchOpen;
    setSearchOpen(next);
    Animated.timing(searchHeight, {
      toValue: next ? 56 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    if (!next) setSearch('');
  }

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleStatusChange(id: string, status: EnquiryStatus) {
    try {
      const { error: updErr } = await supabase.from('enquiries').update({ status }).eq('id', id);
      if (updErr) throw new Error(updErr.message);
      await refetch();
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  const filteredListingTitle = listingFilter ? (enquiries[0]?.listing_title ?? 'this listing') : null;

  const header = (
    <View>
      <View style={styles.headerCard}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Enquiries</Text>
          <Pressable accessibilityRole="button" style={styles.iconButton} onPress={toggleSearch}>
            <Feather name="search" size={18} color={colors.gray500} />
          </Pressable>
        </View>

        <Animated.View style={[styles.searchWrap, { height: searchHeight }]}>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={colors.gray400} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, phone, or listing"
              placeholderTextColor={colors.gray400}
              value={search}
              onChangeText={setSearch}
              autoFocus={searchOpen}
              autoCorrect={false}
            />
          </View>
        </Animated.View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = statusFilter === f.value;
            const isNew = f.value === 'new';
            const count = counts[f.value as keyof EnquiryCounts];
            return (
              <Pressable
                key={f.value}
                onPress={() => setStatusFilter(f.value)}
                style={[
                  styles.pill,
                  active ? styles.pillActive : isNew ? styles.pillNew : styles.pillInactive,
                ]}>
                <Text
                  style={
                    active ? styles.pillTextActive : isNew ? styles.pillTextNew : styles.pillTextInactive
                  }>
                  {f.label}
                  {count > 0 ? `  ${count}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {listingFilter ? (
        <View style={styles.filterStrip}>
          <Feather name="filter" size={14} color={colors.blue600} />
          <Text style={styles.filterStripText} numberOfLines={1}>
            Showing enquiries for: {filteredListingTitle}
          </Text>
          <Pressable accessibilityLabel="Clear filter" onPress={() => setListingFilter(null)}>
            <Feather name="x" size={14} color={colors.blue600} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.headerGap} />
    </View>
  );

  const empty = loading ? (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={90} borderRadius={16} />
      <Skeleton width="100%" height={90} borderRadius={16} />
      <Skeleton width="100%" height={90} borderRadius={16} />
    </View>
  ) : error ? (
    <EmptyState icon="wifi-off" title="Couldn't load enquiries" body={error} ctaLabel="Retry" onCta={refetch} />
  ) : statusFilter !== 'all' || search ? (
    <EmptyState
      icon="filter"
      title={`No ${search ? 'matching' : (FILTER_LABEL[statusFilter] ?? '')} enquiries`}
      body="Switch filters to see other enquiries."
      secondaryLabel="View all enquiries"
      onSecondary={() => {
        setStatusFilter('all');
        setSearch('');
      }}
    />
  ) : (
    <EmptyState
      icon="message-square"
      title="No enquiries yet"
      body="When renters enquire about your listings, they'll appear here."
    />
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <EnquiryCard
              enquiry={item}
              onPress={() => router.push(`/(agent)/enquiries/${item.id}` as Href)}
              onStatusChange={handleStatusChange}
            />
          </View>
        )}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray50 },
  listContent: { paddingBottom: 100 },
  headerCard: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    paddingTop: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.gray900, letterSpacing: -0.3 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: { overflow: 'hidden', paddingHorizontal: 20 },
  searchBox: { justifyContent: 'center', marginBottom: 12 },
  searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
  searchInput: {
    height: 44,
    backgroundColor: colors.gray50,
    borderRadius: 10,
    paddingLeft: 36,
    paddingRight: 14,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.gray900,
  },
  filterRow: { gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  pill: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  pillInactive: { backgroundColor: colors.gray50, borderColor: colors.gray200 },
  pillActive: { backgroundColor: colors.blue600, borderColor: colors.blue600 },
  pillNew: { backgroundColor: colors.warningBg, borderColor: '#FDE68A' },
  pillTextInactive: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray500 },
  pillTextActive: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },
  pillTextNew: { fontFamily: fonts.semibold, fontSize: 13, color: colors.warningText },
  filterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.blue50,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  filterStripText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.blue600 },
  separator: { height: 10 },
  headerGap: { height: 12 },
  cardWrap: { paddingHorizontal: 20 },
  skeletonWrap: { gap: 10, paddingHorizontal: 20 },
});
