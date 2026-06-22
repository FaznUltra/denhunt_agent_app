import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router, type Href } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Avatar, EmptyState, Skeleton } from '@/components/ui';
import { formatRelativeDate } from '@/utils/format';
import { supabase } from '@/lib/supabase';
import { useTeam, type TeamMember } from '@/hooks/useTeam';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import InviteAgentSheet from '@/components/team/InviteAgentSheet';

type Filter = 'all' | 'active' | 'invited';
const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'invited' },
];

function isExpired(iso: string | null): boolean {
  return !!iso && new Date(iso) < new Date();
}

function reshareInvite(token: string | null) {
  if (!token) return;
  const url = `https://denhunt.com/invite/${token}`;
  Share.share({ message: `Join my agency on DenHunt: ${url}` }).catch(() => {});
}

export default function TeamScreen() {
  const { profile } = useAgentProfile();
  const { agency, members, loading, totalActive, pendingInvites, refetch } = useTeam();
  const [filter, setFilter] = useState<Filter>('all');
  const [inviteVisible, setInviteVisible] = useState(false);
  const [actionTarget, setActionTarget] = useState<TeamMember | null>(null);

  const filtered = useMemo(
    () => members.filter((m) => (filter === 'all' ? m.status !== 'removed' : m.status === filter)),
    [members, filter],
  );

  async function removeMember(member: TeamMember) {
    const { error } = await supabase
      .from('agency_members')
      .update({ status: 'removed', removed_at: new Date().toISOString(), removal_reason: 'admin_removed' })
      .eq('id', member.id);
    if (error) {
      Alert.alert('Could not remove agent', error.message);
      return;
    }
    // Best-effort role downgrade. agency_members is the source of truth, so a
    // failure here (e.g. RLS) must not block the flow.
    if (member.user_id) {
      const { error: roleErr } = await supabase
        .from('users')
        .update({ role: 'individual_agent' })
        .eq('id', member.user_id);
      if (roleErr) console.warn('[team] role downgrade failed:', roleErr.message);
    }
    refetch();
    Alert.alert('Agent removed', 'They have been removed from your team. Their listings remain under the agency.');
  }

  async function cancelInvite(memberId: string) {
    const { error } = await supabase
      .from('agency_members')
      .update({ status: 'removed', invite_token: null })
      .eq('id', memberId);
    if (error) {
      Alert.alert('Could not cancel invite', error.message);
      return;
    }
    refetch();
  }

  function confirmRemove(member: TeamMember) {
    setActionTarget(null);
    Alert.alert(
      'Remove agent',
      `This will remove ${member.full_name ?? 'this agent'} from your agency. Their listings will remain under the agency account. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeMember(member) },
      ],
    );
  }

  // Access guard — team management is agency_admin only.
  if (profile && profile.role !== 'agency_admin') {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Header onInvite={() => setInviteVisible(true)} showInvite={false} />
        <View style={styles.center}>
          <Feather name="lock" size={40} color={colors.gray400} />
          <Text style={styles.restrictTitle}>Access restricted</Text>
          <Text style={styles.restrictBody}>Only agency admins can manage the team.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Header onInvite={() => setInviteVisible(true)} showInvite />

      {loading ? (
        <View style={styles.loadingBody}>
          <Skeleton width="100%" height={120} borderRadius={16} />
          <Skeleton width="100%" height={88} borderRadius={16} />
          <Skeleton width="100%" height={88} borderRadius={16} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListHeaderComponent={
            <View>
              <View style={styles.agencyCard}>
                <View style={styles.agencyRow}>
                  <Avatar name={agency?.name ?? 'Agency'} uri={agency?.logo_url} size={44} />
                  <View style={styles.flex}>
                    <Text style={styles.agencyName} numberOfLines={1}>
                      {agency?.name ?? 'Your agency'}
                    </Text>
                    <View
                      style={[
                        styles.tag,
                        agency?.verification_status === 'verified' ? styles.tagVerified : styles.tagPending,
                      ]}>
                      <Text
                        style={[
                          styles.tagText,
                          { color: agency?.verification_status === 'verified' ? colors.successText : colors.warningText },
                        ]}>
                        {agency?.verification_status === 'verified' ? 'Verified' : 'Pending verification'}
                      </Text>
                    </View>
                  </View>
                  <Pressable hitSlop={8} onPress={() => Alert.alert('Agency settings', 'Agency settings coming soon')}>
                    <Feather name="settings" size={18} color={colors.gray400} />
                  </Pressable>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{totalActive}</Text>
                    <Text style={styles.statLabel}>Active agents</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: pendingInvites > 0 ? colors.warningText : colors.gray400 }]}>
                      {pendingInvites}
                    </Text>
                    <Text style={styles.statLabel}>Pending invites</Text>
                  </View>
                </View>
              </View>

              <View style={styles.filterRow}>
                {FILTERS.map((f) => {
                  const active = filter === f.value;
                  return (
                    <Pressable
                      key={f.value}
                      style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
                      onPress={() => setFilter(f.value)}>
                      <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          }
          renderItem={({ item }) =>
            item.status === 'invited' ? (
              <PendingCard member={item} onResend={() => reshareInvite(item.invite_token)} onCancel={() => cancelInvite(item.id)} />
            ) : (
              <ActiveCard member={item} onMore={() => setActionTarget(item)} />
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="users"
                title="No agents yet"
                body="Invite your first agent to start building your team."
                ctaLabel="Invite agent"
                onCta={() => setInviteVisible(true)}
              />
            </View>
          }
        />
      )}

      <InviteAgentSheet visible={inviteVisible} onClose={() => setInviteVisible(false)} />

      <ActionSheet
        member={actionTarget}
        onClose={() => setActionTarget(null)}
        onViewListings={(m) => {
          setActionTarget(null);
          router.push(`/(agent)/listings?agentId=${m.user_id}` as Href);
        }}
        onRemove={confirmRemove}
      />
    </SafeAreaView>
  );
}

function Header({ onInvite, showInvite }: { onInvite: () => void; showInvite: boolean }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Back" onPress={() => router.push('/(agent)' as Href)}>
        <Feather name="arrow-left" size={22} color={colors.gray900} />
      </Pressable>
      <Text style={styles.headerTitle}>My team</Text>
      {showInvite ? (
        <Pressable style={styles.inviteBtn} onPress={onInvite}>
          <Feather name="user-plus" size={18} color={colors.blue600} />
        </Pressable>
      ) : (
        <View style={styles.inviteSpacer} />
      )}
    </View>
  );
}

function VerificationTag({ status }: { status: string | null }) {
  const verified = status === 'verified';
  return (
    <View style={[styles.tag, verified ? styles.tagVerified : styles.tagPending]}>
      <Text style={[styles.tagText, { color: verified ? colors.successText : colors.warningText }]}>
        {verified ? 'Verified' : 'Pending'}
      </Text>
    </View>
  );
}

function ActiveCard({ member, onMore }: { member: TeamMember; onMore: () => void }) {
  return (
    <View style={styles.memberCard}>
      <View style={styles.memberRow}>
        <Avatar name={member.full_name ?? 'Agent'} uri={member.profile_photo_url} size={44} />
        <View style={styles.flex}>
          <Text style={styles.memberName} numberOfLines={1}>
            {member.full_name ?? 'Agent'}
          </Text>
          <Text style={styles.memberMeta}>
            {member.joined_at ? `Joined ${formatRelativeDate(member.joined_at)}` : 'Active member'}
          </Text>
        </View>
        <VerificationTag status={member.verification_status} />
        <Pressable hitSlop={8} style={styles.moreBtn} onPress={onMore}>
          <Feather name="more-vertical" size={18} color={colors.gray400} />
        </Pressable>
      </View>

      {member.areas.length > 0 ? (
        <View style={styles.areaRow}>
          <Feather name="map-pin" size={12} color={colors.gray400} />
          <Text style={styles.areaText} numberOfLines={1}>
            {member.areas.slice(0, 3).join(', ')}
            {member.areas.length > 3 ? ` +${member.areas.length - 3} more` : ''}
          </Text>
        </View>
      ) : null}

      {member.property_types.length > 0 ? (
        <View style={styles.chipWrap}>
          {member.property_types.slice(0, 4).map((t) => (
            <View key={t} style={styles.chip}>
              <Text style={styles.chipText}>{t.replace(/_/g, ' ')}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PendingCard({
  member,
  onResend,
  onCancel,
}: {
  member: TeamMember;
  onResend: () => void;
  onCancel: () => void;
}) {
  const expired = isExpired(member.invite_expires_at);
  return (
    <View style={styles.pendingCard}>
      <View style={styles.memberRow}>
        <View style={styles.pendingIcon}>
          <Feather name="clock" size={20} color={colors.warningText} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.pendingTitle}>Pending invite</Text>
          {expired ? (
            <Text style={styles.expiredText}>Expired</Text>
          ) : (
            <Text style={styles.pendingExpiry}>
              {member.invite_expires_at ? `Expires ${formatRelativeDate(member.invite_expires_at)}` : 'Awaiting acceptance'}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.pendingActions}>
        <Pressable style={styles.resendBtn} onPress={onResend}>
          <Text style={styles.resendText}>Resend</Text>
        </Pressable>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ActionSheet({
  member,
  onClose,
  onViewListings,
  onRemove,
}: {
  member: TeamMember | null;
  onClose: () => void;
  onViewListings: (m: TeamMember) => void;
  onRemove: (m: TeamMember) => void;
}) {
  if (!member) return null;
  return (
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable style={styles.actionSheet}>
        <View style={styles.handle} />
        <Text style={styles.sheetName}>{member.full_name ?? 'Agent'}</Text>
        <Pressable style={styles.sheetRow} onPress={() => onViewListings(member)}>
          <Feather name="list" size={18} color={colors.gray700} />
          <Text style={styles.sheetRowText}>View listings</Text>
        </Pressable>
        <Pressable style={styles.sheetRow} onPress={() => onRemove(member)}>
          <Feather name="user-x" size={18} color={colors.errorText} />
          <Text style={[styles.sheetRowText, { color: colors.errorText }]}>Remove from agency</Text>
        </Pressable>
        <Pressable style={styles.sheetCancel} onPress={onClose}>
          <Text style={styles.sheetCancelText}>Cancel</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray50 },
  flex: { flex: 1 },
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
  inviteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.blue50, alignItems: 'center', justifyContent: 'center' },
  inviteSpacer: { width: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  restrictTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.gray900, marginTop: 14 },
  restrictBody: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, marginTop: 6, textAlign: 'center' },
  loadingBody: { padding: 20, gap: 12 },
  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  sep: { height: 10 },

  agencyCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.gray100 },
  agencyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  agencyName: { fontFamily: fonts.bold, fontSize: 16, color: colors.gray900 },
  statsRow: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.gray100 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.gray900 },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray500, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.gray100, alignSelf: 'center' },

  filterRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 12 },
  pill: { borderRadius: 20, paddingVertical: 7, paddingHorizontal: 16, borderWidth: 1 },
  pillActive: { backgroundColor: colors.blue600, borderColor: colors.blue600 },
  pillInactive: { backgroundColor: colors.white, borderColor: colors.gray200 },
  pillText: { fontFamily: fonts.medium, fontSize: 13 },
  pillTextActive: { color: colors.white },
  pillTextInactive: { color: colors.gray500 },

  memberCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.gray100 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.gray900 },
  memberMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 2 },
  moreBtn: { padding: 2 },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  areaText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.gray500 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { backgroundColor: colors.gray50, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  chipText: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray700, textTransform: 'capitalize' },

  tag: { alignSelf: 'flex-start', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8, marginTop: 4 },
  tagVerified: { backgroundColor: colors.successBg },
  tagPending: { backgroundColor: colors.warningBg },
  tagText: { fontFamily: fonts.semibold, fontSize: 11 },

  pendingCard: { backgroundColor: '#FFFDF0', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FDE68A' },
  pendingIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.warningBg, alignItems: 'center', justifyContent: 'center' },
  pendingTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.warningText },
  pendingExpiry: { fontFamily: fonts.regular, fontSize: 12, color: colors.warningText, opacity: 0.7, marginTop: 2 },
  expiredText: { fontFamily: fonts.regular, fontSize: 12, color: colors.errorText, marginTop: 2 },
  pendingActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  resendBtn: { borderWidth: 1, borderColor: colors.warningText, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  resendText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.warningText },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  cancelText: { fontFamily: fonts.medium, fontSize: 12, color: colors.gray500 },

  emptyWrap: { paddingTop: 40 },

  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.gray200, alignSelf: 'center', marginBottom: 12 },
  sheetName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.gray900, textAlign: 'center', marginBottom: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.gray100 },
  sheetRowText: { fontFamily: fonts.medium, fontSize: 15, color: colors.gray700 },
  sheetCancel: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  sheetCancelText: { fontFamily: fonts.medium, fontSize: 15, color: colors.gray500 },
});
