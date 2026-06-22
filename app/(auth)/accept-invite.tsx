import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { supabase } from '@/lib/supabase';
import { useOnboardingStore } from '@/stores/onboardingStore';

type AgencyPreview = {
  id: string;
  name: string;
  logo_url: string | null;
  verification_status: string;
};

const INFO = [
  { icon: 'shield' as const, text: 'Your listings will be verified by DenHunt' },
  { icon: 'home' as const, text: 'You will represent this agency on all listings' },
  { icon: 'lock' as const, text: 'All client communication stays on-platform' },
];

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const setInviteToken = useOnboardingStore((s) => s.setInviteToken);

  const [loading, setLoading] = useState(true);
  const [agency, setAgency] = useState<AgencyPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        setErrorMsg('Invalid invite link');
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke('validate-invite', { body: { token } });
        if (!active) return;
        if (error || !data?.valid) {
          setErrorMsg(data?.error ?? 'This invite link is not valid.');
        } else {
          setAgency(data.agency as AgencyPreview);
        }
      } catch {
        if (active) setErrorMsg('Could not verify this invite. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  function proceedToSignup() {
    if (!token) return;
    // Role is derived from the invite token at account creation (identity step).
    setInviteToken(token);
    router.push('/(auth)/phone' as Href);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <ActivityIndicator size="large" color={colors.blue600} />
        <Text style={styles.loadingText}>Verifying invite…</Text>
      </SafeAreaView>
    );
  }

  if (errorMsg || !agency) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <Feather name="alert-circle" size={48} color={colors.errorText} />
        <Text style={styles.invalidTitle}>Invalid invite</Text>
        <Text style={styles.invalidBody}>{errorMsg ?? 'This invite link is not valid.'}</Text>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => Linking.openURL('https://apps.apple.com/').catch(() => {})}>
          <Text style={styles.primaryText}>Download DenHunt Agent</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const verified = agency.verification_status === 'verified';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          {agency.logo_url ? (
            <Image source={{ uri: agency.logo_url }} style={styles.logo} resizeMode="cover" />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoInitial}>{agency.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.invitedLabel}>You&apos;ve been invited to join</Text>
          <Text style={styles.agencyName}>{agency.name}</Text>
          {verified ? (
            <View style={styles.verifiedTag}>
              <Feather name="check-circle" size={13} color={colors.successText} />
              <Text style={styles.verifiedText}>Verified agency on DenHunt</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.infoCards}>
          {INFO.map((c) => (
            <View key={c.icon} style={styles.infoCard}>
              <Feather name={c.icon} size={20} color={colors.blue600} />
              <Text style={styles.infoText}>{c.text.replace('this agency', agency.name)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottom}>
          <Pressable style={styles.primaryBtn} onPress={proceedToSignup}>
            <Text style={styles.primaryText}>Join {agency.name}</Text>
          </Pressable>
          <Pressable style={styles.ghostBtn} onPress={() => router.replace('/' as Href)}>
            <Text style={styles.ghostText}>Not for me</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  centerScreen: { flex: 1, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, marginTop: 12 },
  invalidTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.gray900, marginTop: 16 },
  invalidBody: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  content: { paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 },
  top: { alignItems: 'center', paddingTop: 48 },
  logo: { width: 72, height: 72, borderRadius: 20 },
  logoFallback: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.blue50, alignItems: 'center', justifyContent: 'center' },
  logoInitial: { fontFamily: fonts.bold, fontSize: 28, color: colors.blue600 },
  invitedLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, marginTop: 20 },
  agencyName: { fontFamily: fonts.bold, fontSize: 26, color: colors.gray900, letterSpacing: -0.4, textAlign: 'center', marginTop: 4 },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.successBg, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, marginTop: 8 },
  verifiedText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.successText },
  infoCards: { marginTop: 32, gap: 10 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.gray50, borderRadius: 12, padding: 14 },
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.gray700 },
  bottom: { marginTop: 'auto', paddingTop: 32 },
  primaryBtn: { backgroundColor: colors.blue600, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  primaryText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  ghostBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  ghostText: { fontFamily: fonts.medium, fontSize: 14, color: colors.gray500 },
});
