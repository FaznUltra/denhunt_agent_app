import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router, type Href } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Avatar, EmptyState, SectionLabel, Skeleton } from '@/components/ui';
import EditProfileModal from '@/components/profile/EditProfileModal';
import EditProfessionalModal from '@/components/profile/EditProfessionalModal';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { signOut } from '@/lib/auth';
import { formatDate, formatMonthYear, formatRelativeDate, maskPhone } from '@/utils/format';
import { SPECIALISATIONS } from '@/constants/listingOptions';
import type { UserRole } from '@/types/database';
import type { SubscriptionInfo } from '@/types/profile';

const ROLE_LABEL: Record<UserRole, string> = {
  individual_agent: 'Individual Agent',
  agency_admin: 'Agency Admin',
  agency_agent: 'Agency Agent',
  renter: 'Renter',
  personal_inspector: 'Personal Inspector',
  admin: 'Admin',
};

type VerifMeta = { bg: string; color: string; icon: keyof typeof Feather.glyphMap; title: string; sub: string };
const VERIFICATION: Record<string, VerifMeta> = {
  verified: { bg: colors.successBg, color: colors.successText, icon: 'shield', title: 'Identity Verified', sub: 'Your identity has been confirmed' },
  pending: { bg: colors.warningBg, color: colors.warningText, icon: 'clock', title: 'Verification Pending', sub: 'Usually takes up to 24 hours' },
  rejected: { bg: colors.errorBg, color: colors.errorText, icon: 'alert-circle', title: 'Verification Failed', sub: 'Tap to resubmit your documents' },
  unverified: { bg: colors.gray50, color: colors.gray500, icon: 'shield', title: 'Not Verified', sub: 'Verify to start posting listings' },
};

const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  agency_starter: 'Agency Starter',
  agency_growth: 'Agency Growth',
};

const SPECIALISATION_LABEL: Record<string, string> = Object.fromEntries(
  SPECIALISATIONS.map((s) => [s.value, s.label]),
);

export default function ProfileScreen() {
  const { profile, agency, subscription, stats, loading, error, refetch } = useAgentProfile();
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editProfessionalVisible, setEditProfessionalVisible] = useState(false);

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // ignore — still send the user to the entry screen
    }
    router.replace('/');
  }

  function confirmSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: handleSignOut },
    ]);
  }

  function confirmDelete() {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account, all your listings, and your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Contact support',
              "To delete your account please contact support@denhunt.com. We'll process your request within 48 hours.",
              [{ text: 'OK' }],
            ),
        },
      ],
    );
  }

  function onVerificationPress(status: string) {
    if (status === 'pending') {
      Alert.alert('Under review', "Your documents are being reviewed. We'll notify you when done.");
    } else if (status === 'rejected' || status === 'unverified') {
      router.push('/(auth)/identity' as Href);
    }
  }

  if (loading) return <ProfileSkeleton />;
  if (error || !profile) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.errorWrap}>
          <EmptyState
            icon="wifi-off"
            title="Couldn't load profile"
            body={error ?? 'Check your connection and try again.'}
            ctaLabel="Retry"
            onCta={refetch}
          />
        </View>
      </SafeAreaView>
    );
  }

  const verif = VERIFICATION[profile.verification_status] ?? VERIFICATION.unverified;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* SECTION 1 — header */}
        <View style={styles.headerCard}>
          <View style={styles.editRow}>
            <Pressable style={styles.editBtn} onPress={() => setEditProfileVisible(true)}>
              <Feather name="edit-2" size={16} color={colors.blue600} />
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.avatarBlock}>
            <Pressable style={styles.avatarPress} onPress={() => setEditProfileVisible(true)}>
              <Avatar name={profile.full_name} uri={profile.profile_photo_url} size={80} />
              <View style={styles.cameraBadge}>
                <Feather name="camera" size={13} color={colors.white} />
              </View>
            </Pressable>
            <Text style={styles.name}>{profile.full_name}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{ROLE_LABEL[profile.role]}</Text>
            </View>
            {agency ? <Text style={styles.agencyName}>{agency.name}</Text> : null}
            <View style={styles.metaLine}>
              <Feather name="phone" size={12} color={colors.gray400} />
              <Text style={styles.metaText}>{maskPhone(profile.phone)}</Text>
            </View>
            <View style={styles.metaLine}>
              <Feather name="calendar" size={12} color={colors.gray400} />
              <Text style={styles.metaTextMuted}>Member since {formatMonthYear(profile.created_at)}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.active_listings_count}</Text>
              <Text style={styles.statLabel}>Active listings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.total_enquiries_count}</Text>
              <Text style={styles.statLabel}>Total enquiries</Text>
            </View>
          </View>
        </View>

        {/* SECTION 2 — verification */}
        <View style={styles.card}>
          <SectionLabel text="Identity verification" />
          <Pressable
            style={styles.verifBlock}
            disabled={profile.verification_status === 'verified'}
            onPress={() => onVerificationPress(profile.verification_status)}>
            <View style={[styles.verifIcon, { backgroundColor: verif.bg }]}>
              <Feather name={verif.icon} size={20} color={verif.color} />
            </View>
            <View style={styles.verifContent}>
              <Text style={[styles.verifTitle, { color: verif.color }]}>{verif.title}</Text>
              <Text style={[styles.verifSub, { color: verif.color }]}>{verif.sub}</Text>
            </View>
            {profile.verification_status !== 'verified' ? (
              <Feather name="chevron-right" size={18} color={colors.gray400} />
            ) : null}
          </Pressable>

          {profile.role === 'agency_admin' && agency ? (
            <>
              <View style={styles.divider} />
              <View style={styles.verifBlock}>
                <View
                  style={[
                    styles.verifIcon,
                    { backgroundColor: (VERIFICATION[agency.verification_status] ?? VERIFICATION.unverified).bg },
                  ]}>
                  <Feather
                    name={(VERIFICATION[agency.verification_status] ?? VERIFICATION.unverified).icon}
                    size={20}
                    color={(VERIFICATION[agency.verification_status] ?? VERIFICATION.unverified).color}
                  />
                </View>
                <View style={styles.verifContent}>
                  <Text
                    style={[
                      styles.verifTitle,
                      { color: (VERIFICATION[agency.verification_status] ?? VERIFICATION.unverified).color },
                    ]}>
                    Agency Verification
                  </Text>
                  <Text style={styles.verifSubMuted}>{agency.name}</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* SECTION 2b — agency membership (agency_agent only) */}
        {profile.role === 'agency_agent' && agency ? (
          <View style={styles.card}>
            <View style={styles.settingsLabel}>
              <SectionLabel text="Agency" />
            </View>
            <View style={styles.agencyMemberRow}>
              <Avatar name={agency.name} uri={agency.logo_url} size={48} />
              <View style={styles.agencyMemberStack}>
                <Text style={styles.agencyMemberName} numberOfLines={1}>
                  {agency.name}
                </Text>
                <Text style={styles.agencyMemberStatus}>Active member</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.gray400} />
            </View>
            <View style={styles.agencyNote}>
              <Feather name="info" size={14} color={colors.gray500} />
              <Text style={styles.agencyNoteText}>
                Your listings represent {agency.name}. Contact your agency admin to make changes to your membership.
              </Text>
            </View>
          </View>
        ) : null}

        {/* SECTION 3 — subscription (billing is the agency's for agency_agent) */}
        {profile.role !== 'agency_agent' ? (
          <View style={styles.card}>
            <SectionLabel text="Subscription" />
            <SubscriptionBlock subscription={subscription} />
          </View>
        ) : null}

        {/* SECTION 4 — professional */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <SectionLabel text="Professional details" />
            <Pressable onPress={() => setEditProfessionalVisible(true)}>
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.proRow}>
            <Feather name="briefcase" size={16} color={colors.gray500} />
            <Text style={styles.proLabel}>Experience</Text>
            <Text style={styles.proValue}>{profile.years_experience ?? 'Not set'}</Text>
          </View>

          <View style={styles.proStack}>
            <View style={styles.proStackHead}>
              <Feather name="map-pin" size={16} color={colors.gray500} />
              <Text style={styles.proLabel}>Areas</Text>
            </View>
            {profile.areas.length > 0 ? (
              <View style={styles.chipWrap}>
                {profile.areas.map((a) => (
                  <View key={a} style={styles.chip}>
                    <Text style={styles.chipText}>{a}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.notSet}>Not set</Text>
            )}
          </View>

          <View style={styles.proStack}>
            <View style={styles.proStackHead}>
              <Feather name="home" size={16} color={colors.gray500} />
              <Text style={styles.proLabel}>Specialises in</Text>
            </View>
            {profile.property_types.length > 0 ? (
              <View style={styles.chipWrap}>
                {profile.property_types.map((t) => (
                  <View key={t} style={styles.chip}>
                    <Text style={styles.chipText}>{SPECIALISATION_LABEL[t] ?? t}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.notSet}>Not set</Text>
            )}
          </View>

          {profile.bio ? (
            <View style={styles.bioBlock}>
              <View style={styles.divider} />
              <View style={styles.bioHead}>
                <Feather name="file-text" size={16} color={colors.gray500} />
                <Text style={styles.proLabel}>About</Text>
              </View>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          ) : null}
        </View>

        {/* SECTION 5 — settings */}
        <View style={styles.card}>
          <View style={styles.settingsLabel}>
            <SectionLabel text="Settings" />
          </View>
          <SettingsRow icon="bell" title="Notifications" subtitle="Manage push notification preferences" onPress={() => Alert.alert('Notifications', 'Notification settings coming soon')} />
          <SettingsRow icon="lock" title="Privacy" subtitle="Control what others can see" onPress={() => Alert.alert('Privacy', 'Privacy settings coming soon')} />
          <SettingsRow icon="help-circle" title="Help & Support" subtitle="FAQs, contact support" onPress={() => Alert.alert('Support', 'Support coming soon')} />
          <SettingsRow icon="file-text" title="Terms of Service" onPress={() => Linking.openURL('https://denhunt.com/terms')} />
          <SettingsRow icon="shield" title="Privacy Policy" onPress={() => Linking.openURL('https://denhunt.com/privacy')} />
          <View style={styles.versionRow}>
            <Feather name="info" size={18} color={colors.gray500} />
            <Text style={styles.versionTitle}>App version</Text>
            <Text style={styles.versionValue}>1.0.0 (1)</Text>
          </View>
        </View>

        {/* SECTION 6 — account actions */}
        <View style={styles.card}>
          <Pressable style={styles.accountRow} onPress={confirmSignOut}>
            <Feather name="log-out" size={18} color={colors.gray700} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
          {profile.role !== 'agency_agent' ? (
            <>
              <View style={styles.divider} />
              <Pressable style={styles.accountRow} onPress={confirmDelete}>
                <Feather name="trash-2" size={18} color={colors.errorText} />
                <Text style={styles.deleteText}>Delete account</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>

      <EditProfileModal
        visible={editProfileVisible}
        profile={profile}
        onClose={() => setEditProfileVisible(false)}
        onSave={() => {
          setEditProfileVisible(false);
          refetch();
        }}
      />
      <EditProfessionalModal
        visible={editProfessionalVisible}
        profile={profile}
        onClose={() => setEditProfessionalVisible(false)}
        onSave={() => {
          setEditProfessionalVisible(false);
          refetch();
        }}
      />
    </SafeAreaView>
  );
}

function SubscriptionBlock({ subscription }: { subscription: SubscriptionInfo | null }) {
  if (!subscription) {
    return (
      <View style={styles.noSub}>
        <Text style={styles.noSubTitle}>No active subscription</Text>
        <Text style={styles.noSubBody}>Subscribe to start posting listings.</Text>
        <Pressable style={styles.subPrimary} onPress={() => Alert.alert('Subscription', 'Subscription management coming soon')}>
          <Text style={styles.subPrimaryText}>Choose a plan</Text>
        </Pressable>
      </View>
    );
  }
  const planLabel = PLAN_LABEL[subscription.plan] ?? subscription.plan;
  return (
    <View style={styles.subWrap}>
      <View style={styles.subHeader}>
        <View style={[styles.planBadge, planBadgeStyle(subscription.plan)]}>
          <Text style={[styles.planBadgeText, { color: planTextColor(subscription.plan) }]}>{planLabel}</Text>
        </View>
        <View style={styles.flex} />
        <View style={[styles.statusTag, statusTagStyle(subscription.status)]}>
          <Text style={[styles.statusTagText, { color: statusTagColor(subscription.status) }]}>
            {subscription.status === 'trial' ? 'Free trial' : subscription.status === 'active' ? 'Active' : 'Expired'}
          </Text>
        </View>
      </View>

      <View style={styles.subRenewal}>
        {subscription.status === 'trial' && subscription.trial_ends_at ? (
          <>
            <Feather name="clock" size={13} color={colors.warningText} />
            <Text style={[styles.subRenewalText, { color: colors.warningText }]}>
              Trial ends {formatRelativeDate(subscription.trial_ends_at)}
            </Text>
          </>
        ) : subscription.status === 'active' && subscription.current_period_end ? (
          <>
            <Feather name="refresh-cw" size={13} color={colors.gray500} />
            <Text style={styles.subRenewalText}>Renews {formatDate(subscription.current_period_end)}</Text>
          </>
        ) : subscription.status === 'expired' ? (
          <>
            <Feather name="alert-circle" size={13} color={colors.errorText} />
            <Text style={[styles.subRenewalText, { color: colors.errorText }]}>Subscription expired</Text>
          </>
        ) : null}
      </View>

      {subscription.status === 'active' ? (
        <Pressable style={styles.subGhost} onPress={() => Alert.alert('Subscription', 'Subscription management coming soon')}>
          <Text style={styles.subGhostText}>Manage subscription</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.subPrimary} onPress={() => Alert.alert('Subscription', 'Subscription management coming soon')}>
          <Text style={styles.subPrimaryText}>Upgrade to Pro</Text>
        </Pressable>
      )}
    </View>
  );
}

function planBadgeStyle(plan: string) {
  if (plan === 'agency_growth') return { backgroundColor: colors.blue900 };
  if (plan === 'pro' || plan === 'agency_starter') return { backgroundColor: colors.blue50 };
  return { backgroundColor: colors.gray50 };
}
function planTextColor(plan: string) {
  if (plan === 'agency_growth') return colors.white;
  if (plan === 'pro' || plan === 'agency_starter') return colors.blue600;
  return colors.gray700;
}
function statusTagStyle(status: string) {
  if (status === 'active') return { backgroundColor: colors.successBg };
  if (status === 'expired') return { backgroundColor: colors.errorBg };
  return { backgroundColor: colors.warningBg };
}
function statusTagColor(status: string) {
  if (status === 'active') return colors.successText;
  if (status === 'expired') return colors.errorText;
  return colors.warningText;
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.settingsRow} onPress={onPress}>
      <Feather name={icon} size={18} color={colors.gray500} />
      <View style={styles.settingsTextWrap}>
        <Text style={styles.settingsTitle}>{title}</Text>
        {subtitle ? <Text style={styles.settingsSub}>{subtitle}</Text> : null}
      </View>
      <Feather name="chevron-right" size={16} color={colors.gray400} />
    </Pressable>
  );
}

function ProfileSkeleton() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.skeletonHeader}>
        <Skeleton width={80} height={80} borderRadius={40} />
        <Skeleton width={160} height={20} />
        <Skeleton width={120} height={14} />
      </View>
      <View style={styles.skeletonBody}>
        <Skeleton width="100%" height={80} borderRadius={12} />
        <Skeleton width="100%" height={120} borderRadius={12} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray50 },
  scrollContent: { paddingBottom: 40 },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerCard: { backgroundColor: colors.white, paddingBottom: 24 },
  editRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 16 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  editText: { fontFamily: fonts.medium, fontSize: 14, color: colors.blue600 },
  avatarBlock: { alignItems: 'center', paddingTop: 8 },
  avatarPress: { position: 'relative' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.blue600,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: fonts.bold, fontSize: 20, color: colors.gray900, letterSpacing: -0.3, marginTop: 12 },
  roleBadge: { backgroundColor: colors.blue50, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12, marginTop: 6 },
  roleBadgeText: { fontFamily: fonts.medium, fontSize: 12, color: colors.blue600 },
  agencyName: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, marginTop: 4 },
  agencyMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  agencyMemberStack: { flex: 1 },
  agencyMemberName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.gray900 },
  agencyMemberStatus: { fontFamily: fonts.regular, fontSize: 12, color: colors.successText, marginTop: 3 },
  agencyNote: { flexDirection: 'row', gap: 8, backgroundColor: colors.gray50, borderRadius: 10, padding: 12, marginTop: 12 },
  agencyNoteText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, lineHeight: 17 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500 },
  metaTextMuted: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400 },
  statsRow: { flexDirection: 'row', marginTop: 20, paddingHorizontal: 20 },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: colors.gray100, alignSelf: 'center' },
  statValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.gray900 },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 2 },

  card: { backgroundColor: colors.white, paddingHorizontal: 20, paddingVertical: 16, marginTop: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: colors.gray100, marginVertical: 12 },

  verifBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  verifIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  verifContent: { flex: 1 },
  verifTitle: { fontFamily: fonts.semibold, fontSize: 15 },
  verifSub: { fontFamily: fonts.regular, fontSize: 12, marginTop: 3, opacity: 0.8 },
  verifSubMuted: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 3 },

  subWrap: { marginTop: 12 },
  subHeader: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  planBadge: { borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  planBadgeText: { fontFamily: fonts.semibold, fontSize: 13 },
  statusTag: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  statusTagText: { fontFamily: fonts.medium, fontSize: 12 },
  subRenewal: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  subRenewalText: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500 },
  subPrimary: { backgroundColor: colors.blue600, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  subPrimaryText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  subGhost: { backgroundColor: colors.gray50, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  subGhostText: { fontFamily: fonts.medium, fontSize: 15, color: colors.gray900 },
  noSub: { marginTop: 12 },
  noSubTitle: { fontFamily: fonts.medium, fontSize: 14, color: colors.gray900 },
  noSubBody: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, marginTop: 4 },

  proRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  proLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, flex: 1 },
  proValue: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray900 },
  proStack: { marginTop: 12 },
  proStackHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { backgroundColor: colors.blue50, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.blue600 },
  notSet: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray400, marginTop: 6 },
  bioBlock: { marginTop: 12 },
  bioHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  bioText: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray700, lineHeight: 20 },

  settingsLabel: { marginBottom: 4 },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  settingsTextWrap: { flex: 1 },
  settingsTitle: { fontFamily: fonts.medium, fontSize: 14, color: colors.gray900 },
  settingsSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 1 },
  versionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  versionTitle: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.gray900 },
  versionValue: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray400 },

  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 },
  signOutText: { fontFamily: fonts.medium, fontSize: 15, color: colors.gray700 },
  deleteText: { fontFamily: fonts.medium, fontSize: 15, color: colors.errorText },

  skeletonHeader: { backgroundColor: colors.white, alignItems: 'center', gap: 12, paddingVertical: 32 },
  skeletonBody: { padding: 20, gap: 12 },
});
