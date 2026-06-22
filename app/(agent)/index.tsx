import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { useNotifications } from '@/hooks/useNotifications';
import InviteAgentSheet from '@/components/team/InviteAgentSheet';
import {
  Avatar,
  Button,
  EmptyState,
  ListingCard,
  SectionLabel,
  Skeleton,
  StatCard,
} from '@/components/ui';
import {
  useDashboardData,
  type AgencyMemberPreview,
  type DashboardData,
  type DashboardUser,
} from '@/hooks/useDashboardData';

// Routes (built incrementally — cast so typed-routes compiles before they exist).
const R = {
  profile: '/(agent)/profile' as Href,
  listings: '/(agent)/listings' as Href,
  create: '/(agent)/listings/create' as Href,
  enquiries: '/(agent)/enquiries' as Href,
  team: '/(agent)/team' as Href,
  identity: '/(auth)/identity' as Href,
  notifications: '/(agent)/notifications' as Href,
};

type QuickAction = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

// ---- Shared chrome ----------------------------------------------------------

function DashboardHeader({ user, unreadCount }: { user: DashboardUser; unreadCount: number }) {
  return (
    <View style={styles.header}>
      <View style={styles.greetingStack}>
        <Text style={styles.greeting}>{greeting()}</Text>
        <Text style={styles.name}>{firstNameOf(user.full_name)}</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          style={styles.bell}
          onPress={() => router.push(R.notifications)}>
          <Feather name="bell" size={22} color={colors.gray500} />
          {unreadCount > 0 ? (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => router.push(R.profile)}>
          <Avatar name={user.full_name} uri={user.profile_photo_url} size={40} />
        </Pressable>
      </View>
    </View>
  );
}

// Non-blocking banner shown when the OS push permission has been denied.
function PushDeniedBanner() {
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => setDenied(status === 'denied'));
  }, []);
  if (!denied) return null;
  return (
    <View style={styles.pushBanner}>
      <Feather name="bell-off" size={18} color={colors.warningText} />
      <View style={styles.pushTextStack}>
        <Text style={styles.pushTitle}>Enable notifications</Text>
        <Text style={styles.pushSub}>Get alerts for new messages and inspections</Text>
      </View>
      <Pressable style={styles.pushBtn} onPress={() => Linking.openSettings()}>
        <Text style={styles.pushBtnText}>Enable</Text>
      </Pressable>
    </View>
  );
}

function DashboardShell({ user, children }: { user: DashboardUser; children: ReactNode }) {
  const { unreadCount } = useNotifications();
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <DashboardHeader user={user} unreadCount={unreadCount} />
        <PushDeniedBanner />
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ label, actionLabel, onAction }: { label: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <SectionLabel text={label} />
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction}>
          <Text style={styles.seeAll}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.quickRow}>
      {actions.map((a) => (
        <Pressable key={a.label} style={styles.quickChip} onPress={a.onPress}>
          <View style={styles.quickIcon}>
            <Feather name={a.icon} size={16} color={colors.blue600} />
          </View>
          <Text style={styles.quickLabel}>{a.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function StatGrid({ children }: { children: ReactNode }) {
  return <View style={styles.statGrid}>{children}</View>;
}

function VerificationBanner({ status }: { status: DashboardUser['verification_status'] }) {
  if (status === 'verified') return null;

  if (status === 'rejected') {
    return (
      <Pressable style={[styles.verifyBanner, styles.verifyBannerError]} onPress={() => router.push(R.identity)}>
        <Feather name="alert-circle" size={20} color={colors.errorText} />
        <View style={styles.verifyTextStack}>
          <Text style={[styles.verifyTitle, { color: colors.errorText }]}>
            Verification failed — tap to resubmit
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.verifyBanner}>
      <Feather name="clock" size={20} color={colors.warningText} />
      <View style={styles.verifyTextStack}>
        <Text style={styles.verifyTitle}>Identity verification pending</Text>
        <Text style={styles.verifySub}>We&apos;ll notify you once approved. Usually within 24 hours.</Text>
      </View>
    </View>
  );
}

function RecentListings({
  data,
  showAgentName = false,
}: {
  data: DashboardData;
  showAgentName?: boolean;
}) {
  return (
    <View style={styles.recentSection}>
      <SectionHeader label="Recent listings" actionLabel="See all" onAction={() => router.push(R.listings)} />
      <View style={styles.recentList}>
        {data.recentListings.length === 0 ? (
          <EmptyState
            icon="home"
            title="No listings yet"
            body="Post your first listing and start getting enquiries."
            ctaLabel="Post a listing"
            onCta={() => router.push(R.create)}
          />
        ) : (
          data.recentListings.map((l) => (
            <ListingCard key={l.id} listing={l} showAgentName={showAgentName} />
          ))
        )}
      </View>
    </View>
  );
}

// ---- Variant A: individual agent -------------------------------------------

function IndividualAgentView({ data }: { data: DashboardData }) {
  const user = data.user as DashboardUser;
  const actions: QuickAction[] = [
    { icon: 'file-plus', label: 'New listing', onPress: () => router.push(R.create) },
    { icon: 'message-square', label: 'Enquiries', onPress: () => router.push(R.enquiries) },
    { icon: 'eye', label: 'My listings', onPress: () => router.push(R.listings) },
    { icon: 'user', label: 'Edit profile', onPress: () => router.push(R.profile) },
  ];

  return (
    <DashboardShell user={user}>
      <VerificationBanner status={user.verification_status} />

      <View style={styles.section}>
        <SectionLabel text="This month" />
        <StatGrid>
          <StatCard value={data.listingCounts.active} label="Active listings" onPress={() => router.push(R.listings)} />
          <StatCard value={data.monthlyEnquiries} label="Enquiries" accent onPress={() => router.push(R.enquiries)} />
          <StatCard value={data.listingCounts.pending_review} label="Pending review" />
          <StatCard value={data.listingCounts.draft} label="Drafts" />
        </StatGrid>
      </View>

      <View style={styles.section}>
        <SectionLabel text="Quick actions" />
        <QuickActions actions={actions} />
      </View>

      <RecentListings data={data} />
    </DashboardShell>
  );
}

// ---- Variant B: agency admin -----------------------------------------------

function AgencyAdminView({ data }: { data: DashboardData }) {
  const user = data.user as DashboardUser;
  const agency = data.agency;
  const stats = data.agencyStats;
  const [inviteVisible, setInviteVisible] = useState(false);
  const actions: QuickAction[] = [
    { icon: 'user-plus', label: 'Invite agent', onPress: () => setInviteVisible(true) },
    { icon: 'file-plus', label: 'New listing', onPress: () => router.push(R.create) },
    { icon: 'users', label: 'My team', onPress: () => router.push(R.team) },
    { icon: 'bar-chart-2', label: 'Analytics', onPress: () => Alert.alert('Analytics', 'Analytics coming soon') },
  ];

  return (
    <DashboardShell user={user}>
      <InviteAgentSheet visible={inviteVisible} onClose={() => setInviteVisible(false)} />
      {/* Agency header card */}
      <View style={styles.section}>
        <View style={styles.agencyCard}>
          <View style={styles.agencyRow}>
            <Avatar name={agency?.name ?? 'Agency'} uri={agency?.logo_url} size={40} />
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
                {agency?.verification_status === 'verified' ? 'Verified' : 'Pending'}
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.agencyStatusMsg,
              { color: agency?.verification_status === 'verified' ? colors.successText : colors.warningText },
            ]}>
            {agency?.verification_status === 'verified'
              ? 'Verified agency'
              : 'Agency verification in progress'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel text="Agency overview" />
        <StatGrid>
          <StatCard value={stats?.total_agents ?? 0} label="Total agents" accent onPress={() => router.push(R.team)} />
          <StatCard value={stats?.total_active_listings ?? 0} label="Active listings" onPress={() => router.push(R.listings)} />
          <StatCard value={stats?.total_enquiries_month ?? 0} label="Enquiries this month" onPress={() => router.push(R.enquiries)} />
          <StatCard value={stats?.pending_listings ?? 0} label="Pending review" />
        </StatGrid>
      </View>

      <View style={styles.section}>
        <SectionLabel text="Quick actions" />
        <QuickActions actions={actions} />
      </View>

      {/* Team preview */}
      <View style={styles.section}>
        <SectionHeader
          label="My team"
          actionLabel={`See all (${stats?.total_agents ?? 0})`}
          onAction={() => router.push(R.team)}
        />
        <View style={styles.teamList}>
          {data.agencyMembers.length === 0 ? (
            <View style={styles.teamEmpty}>
              <Feather name="users" size={28} color={colors.gray400} />
              <Text style={styles.teamEmptyTitle}>No agents yet</Text>
              <Text style={styles.teamEmptyBody}>Invite your first agent to get started</Text>
              <View style={styles.teamEmptyCta}>
                <Button
                  variant="secondary"
                  label="Invite agent"
                  fullWidth={false}
                  onPress={() => setInviteVisible(true)}
                />
              </View>
            </View>
          ) : (
            data.agencyMembers.map((m) => <TeamRow key={m.id} member={m} />)
          )}
        </View>
      </View>

      <RecentListings data={data} showAgentName />
    </DashboardShell>
  );
}

function TeamRow({ member }: { member: AgencyMemberPreview }) {
  const verified = member.verification_status === 'verified';
  return (
    <Pressable style={styles.teamRow} onPress={() => router.push(R.team)}>
      <Avatar name={member.full_name} uri={member.profile_photo_url} size={36} />
      <Text style={styles.teamName} numberOfLines={1}>
        {member.full_name}
      </Text>
      <View style={[styles.tag, verified ? styles.tagVerified : styles.tagPending]}>
        <Text style={[styles.tagText, { color: verified ? colors.successText : colors.warningText }]}>
          {verified ? 'Verified' : 'Pending'}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.gray400} />
    </Pressable>
  );
}

// ---- Variant C: agency agent -----------------------------------------------

function AgencyAgentView({ data }: { data: DashboardData }) {
  const user = data.user as DashboardUser;
  const agency = data.agency;
  const actions: QuickAction[] = [
    { icon: 'file-plus', label: 'New listing', onPress: () => router.push(R.create) },
    { icon: 'message-square', label: 'Enquiries', onPress: () => router.push(R.enquiries) },
    { icon: 'eye', label: 'My listings', onPress: () => router.push(R.listings) },
    { icon: 'user', label: 'Edit profile', onPress: () => router.push(R.profile) },
  ];

  return (
    <DashboardShell user={user}>
      <View style={styles.membershipBanner}>
        <Avatar name={agency?.name ?? 'Agency'} uri={agency?.logo_url} size={28} />
        <Text style={styles.membershipText} numberOfLines={1}>
          Part of {agency?.name ?? 'your agency'}
        </Text>
      </View>

      <View style={styles.section}>
        <SectionLabel text="Your activity" />
        <StatGrid>
          <StatCard value={data.listingCounts.active} label="My active listings" onPress={() => router.push(R.listings)} />
          <StatCard value={data.monthlyEnquiries} label="Enquiries this month" accent onPress={() => router.push(R.enquiries)} />
          <StatCard value={data.listingCounts.pending_review} label="Pending review" />
          <StatCard value={data.listingCounts.draft} label="Drafts" />
        </StatGrid>
      </View>

      <View style={styles.section}>
        <SectionLabel text="Quick actions" />
        <QuickActions actions={actions} />
      </View>

      <RecentListings data={data} />
    </DashboardShell>
  );
}

// ---- Loading / error --------------------------------------------------------

function DashboardSkeleton() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={{ gap: 8 }}>
          <Skeleton width={90} height={12} />
          <Skeleton width={140} height={22} />
        </View>
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>
      <View style={styles.section}>
        <View style={styles.statGrid}>
          <Skeleton width="47%" height={74} borderRadius={12} />
          <Skeleton width="47%" height={74} borderRadius={12} />
          <Skeleton width="47%" height={74} borderRadius={12} />
          <Skeleton width="47%" height={74} borderRadius={12} />
        </View>
      </View>
      <View style={[styles.section, { gap: 12 }]}>
        <Skeleton width="100%" height={208} borderRadius={16} />
        <Skeleton width="100%" height={208} borderRadius={16} />
      </View>
    </SafeAreaView>
  );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.errorWrap}>
        <Feather name="wifi-off" size={40} color={colors.gray400} />
        <Text style={styles.errorTitle}>Couldn&apos;t load your dashboard</Text>
        <Text style={styles.errorBody}>Check your connection and try again.</Text>
        <View style={styles.errorCta}>
          <Button variant="secondary" label="Retry" fullWidth={false} onPress={onRetry} />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---- Entry ------------------------------------------------------------------

export default function AgentHomepage() {
  const data = useDashboardData();

  if (data.loading && !data.user) return <DashboardSkeleton />;
  if (data.error) return <DashboardError onRetry={data.refetch} />;
  if (!data.user) return <DashboardSkeleton />;

  const role = data.role;
  if (role === 'agency_admin') return <AgencyAdminView data={data} />;
  if (role === 'agency_agent') return <AgencyAgentView data={data} />;
  return <IndividualAgentView data={data} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  greetingStack: { flexShrink: 1 },
  greeting: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500 },
  name: { fontFamily: fonts.bold, fontSize: 22, color: colors.gray900, letterSpacing: -0.3, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bell: { padding: 2 },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.errorText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: { fontFamily: fonts.bold, fontSize: 10, color: colors.white },
  pushBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 8,
    padding: 12,
  },
  pushTextStack: { flex: 1 },
  pushTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.warningText },
  pushSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.warningText, opacity: 0.8, marginTop: 1 },
  pushBtn: { backgroundColor: colors.warningText, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  pushBtnText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.white },
  section: { marginHorizontal: 20, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { fontFamily: fonts.medium, fontSize: 13, color: colors.blue600 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  quickRow: { gap: 10, marginTop: 10, paddingRight: 20 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray100,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray900 },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.warningBg,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
  },
  verifyBannerError: { backgroundColor: colors.errorBg },
  verifyTextStack: { flex: 1 },
  verifyTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.warningText },
  verifySub: { fontFamily: fonts.regular, fontSize: 12, color: colors.warningText, opacity: 0.8, marginTop: 2 },
  recentSection: { marginHorizontal: 20, marginTop: 24, marginBottom: 100 },
  recentList: { marginTop: 10 },
  agencyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  agencyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  agencyName: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.gray900 },
  agencyStatusMsg: { fontFamily: fonts.regular, fontSize: 12, marginTop: 10 },
  tag: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  tagVerified: { backgroundColor: colors.successBg },
  tagPending: { backgroundColor: colors.warningBg },
  tagText: { fontFamily: fonts.medium, fontSize: 12 },
  teamList: { marginTop: 10 },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.gray100,
    marginBottom: 8,
  },
  teamName: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.gray900 },
  teamEmpty: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  teamEmptyTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gray900, marginTop: 10 },
  teamEmptyBody: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, marginTop: 4, textAlign: 'center' },
  teamEmptyCta: { marginTop: 14 },
  membershipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.blue50,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  membershipText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.blue800 },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  errorTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.gray900, marginTop: 16 },
  errorBody: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, marginTop: 6, textAlign: 'center' },
  errorCta: { marginTop: 20 },
});
