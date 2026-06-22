import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router, type Href } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { EmptyState, Skeleton } from '@/components/ui';
import { formatRelativeDate } from '@/utils/format';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';

type IconSpec = { icon: keyof typeof Feather.glyphMap; bg: string; color: string };

const ICONS: Record<string, IconSpec> = {
  new_message: { icon: 'message-circle', bg: colors.blue50, color: colors.blue600 },
  inspection_scheduled: { icon: 'calendar', bg: colors.warningBg, color: colors.warningText },
  escrow_released: { icon: 'check-circle', bg: colors.successBg, color: colors.successText },
  dispute_raised: { icon: 'alert-circle', bg: colors.errorBg, color: colors.errorText },
  dispute_resolved: { icon: 'shield', bg: colors.successBg, color: colors.successText },
  listing_approved: { icon: 'check', bg: colors.successBg, color: colors.successText },
  listing_rejected: { icon: 'x-circle', bg: colors.errorBg, color: colors.errorText },
  verification_complete: { icon: 'shield', bg: colors.successBg, color: colors.successText },
};

function iconFor(type: string): IconSpec {
  return ICONS[type] ?? { icon: 'bell', bg: colors.gray50, color: colors.gray500 };
}

// Deep-link from a notification's data payload.
export function openNotificationTarget(data: Record<string, string> | null) {
  if (!data) return;
  switch (data.screen) {
    case 'chat':
      if (data.session_id) router.push(`/(agent)/chat/${data.session_id}` as Href);
      break;
    case 'listings':
      router.push((data.listing_id ? `/(agent)/listings/${data.listing_id}` : '/(agent)/listings') as Href);
      break;
    case 'enquiries':
      router.push('/(agent)/enquiries' as Href);
      break;
    default:
      break;
  }
}

function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
}) {
  const spec = iconFor(item.type);
  return (
    <Pressable
      style={[styles.row, { backgroundColor: item.is_read ? colors.white : '#F0F5FF' }]}
      onPress={() => onPress(item)}>
      <View style={[styles.iconWrap, { backgroundColor: spec.bg }]}>
        <Feather name={spec.icon} size={18} color={spec.color} />
      </View>
      <View style={styles.middle}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.time}>{formatRelativeDate(item.created_at)}</Text>
      </View>
      {!item.is_read ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { notifications, unreadCount, loading, markAllRead, markOneRead } = useNotifications();

  function handlePress(item: AppNotification) {
    if (!item.is_read) markOneRead(item.id);
    openNotificationTarget(item.data);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" onPress={() => router.push('/(agent)' as Href)}>
          <Feather name="arrow-left" size={22} color={colors.gray900} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead}>
            <Text style={styles.markAll}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={styles.markAllSpacer} />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingBody}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={64} borderRadius={12} />
          ))}
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => <NotificationRow item={item} onPress={handlePress} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="bell"
                title="No notifications yet"
                body="You'll see inspection updates, messages, and listing activity here."
              />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 20, color: colors.gray900 },
  markAll: { fontFamily: fonts.medium, fontSize: 13, color: colors.blue600 },
  markAllSpacer: { width: 1 },
  loadingBody: { padding: 20, gap: 12 },
  listContent: { paddingBottom: 40, flexGrow: 1 },
  separator: { height: 1, backgroundColor: colors.gray100 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1 },
  title: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gray900 },
  body: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray700, lineHeight: 18, marginTop: 3 },
  time: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginTop: 5 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue600, marginTop: 6 },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingTop: 80 },
});
