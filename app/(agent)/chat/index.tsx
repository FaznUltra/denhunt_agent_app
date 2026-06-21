import { useState } from 'react';
import { FlatList, Image, Pressable, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router, type Href } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Avatar, EmptyState, Skeleton } from '@/components/ui';
import { formatRelativeDate } from '@/utils/format';
import { useConversations } from '@/hooks/useConversations';
import type { Conversation } from '@/types/chat';

export default function ConversationsScreen() {
  const { conversations, loading, error, refetch } = useConversations();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const header = (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={styles.backButton}
        onPress={() => router.push('/(agent)/enquiries' as Href)}>
        <Feather name="arrow-left" size={20} color={colors.gray900} />
      </Pressable>
      <Text style={styles.title}>Messages</Text>
      <View style={styles.backButton} />
    </View>
  );

  const empty = loading ? (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={72} borderRadius={16} />
      <Skeleton width="100%" height={72} borderRadius={16} />
      <Skeleton width="100%" height={72} borderRadius={16} />
    </View>
  ) : error ? (
    <EmptyState icon="wifi-off" title="Couldn't load messages" body={error} ctaLabel="Retry" onCta={refetch} />
  ) : (
    <EmptyState
      icon="message-square"
      title="No conversations yet"
      body="Chats open after a renter pays the inspection fee for one of your listings."
    />
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ConversationRow conversation={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </SafeAreaView>
  );
}

function ConversationRow({ conversation }: { conversation: Conversation }) {
  const locked = !conversation.chat_unlocked;
  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push(`/(agent)/chat/${conversation.id}` as Href)}>
      <View>
        {conversation.listing_cover_photo ? (
          <Image source={{ uri: conversation.listing_cover_photo }} style={styles.thumb} />
        ) : (
          <Avatar name={conversation.renter_name} size={48} />
        )}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>
            {conversation.renter_name}
          </Text>
          {conversation.last_message_at ? (
            <Text style={styles.time}>{formatRelativeDate(conversation.last_message_at)}</Text>
          ) : null}
        </View>
        <Text style={styles.listing} numberOfLines={1}>
          {conversation.listing_title ?? 'Listing'}
        </Text>
        <View style={styles.rowBottom}>
          {locked ? (
            <View style={styles.lockedRow}>
              <Feather name="lock" size={12} color={colors.gray400} />
              <Text style={styles.lockedText}>Awaiting payment</Text>
            </View>
          ) : (
            <Text style={styles.preview} numberOfLines={1}>
              {conversation.last_message ?? 'Tap to open chat'}
            </Text>
          )}
          {conversation.unread_count > 0 ? (
            <View style={styles.unread}>
              <Text style={styles.unreadText}>{conversation.unread_count}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray50 },
  listContent: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.gray900, letterSpacing: -0.3 },
  skeletonWrap: { gap: 10, paddingHorizontal: 20, paddingTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  thumb: { width: 48, height: 48, borderRadius: 12 },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.gray900 },
  time: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginLeft: 8 },
  listing: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 1 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  preview: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.gray500 },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  lockedText: { fontFamily: fonts.medium, fontSize: 12, color: colors.gray400 },
  unread: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.blue600,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.white },
});
