import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  Share,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { supabase } from '@/lib/supabase';

export interface InviteAgentSheetProps {
  visible: boolean;
  onClose: () => void;
}

const PERKS = ['Link expires after 7 days', 'One agent per link', 'Agent joins under your agency account'];

export default function InviteAgentSheet({ visible, onClose }: InviteAgentSheetProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState('');
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setLoading(false);
      setInviteUrl(null);
      scale.setValue(0);
    }
  }, [visible, scale]);

  async function generateInvite() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invite', { body: {} });
      if (error || !data?.invite_url) throw error ?? new Error('No invite');
      setInviteUrl(data.invite_url);
      setAgencyName(data.agency_name ?? '');
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    } catch {
      Alert.alert('Could not generate invite', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function shareLink() {
    if (!inviteUrl) return;
    try {
      await Share.share({
        message: `Join my agency on DenHunt! Use this link to sign up as an agent under ${agencyName}: ${inviteUrl}`,
      });
    } catch {
      // user dismissed — ignore
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />

          {!inviteUrl ? (
            <>
              <View style={styles.iconBlock}>
                <Feather name="user-plus" size={32} color={colors.blue600} />
              </View>
              <Text style={styles.title}>Invite an agent</Text>
              <Text style={styles.body}>
                Generate a link to share with your agent. They&apos;ll join your agency when they sign up.
              </Text>

              <View style={styles.perks}>
                {PERKS.map((p) => (
                  <View key={p} style={styles.perkRow}>
                    <Feather name="check" size={14} color={colors.successText} />
                    <Text style={styles.perkText}>{p}</Text>
                  </View>
                ))}
              </View>

              <Pressable style={[styles.primaryBtn, loading && styles.btnDisabled]} disabled={loading} onPress={generateInvite}>
                {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Generate invite link</Text>}
              </Pressable>
            </>
          ) : (
            <>
              <Animated.View style={[styles.successBlock, { transform: [{ scale }] }]}>
                <Feather name="check-circle" size={32} color={colors.successText} />
              </Animated.View>
              <Text style={[styles.title, { marginTop: 16 }]}>Link ready to share</Text>

              <View style={styles.linkBox}>
                <Text style={styles.linkText} selectable numberOfLines={2} ellipsizeMode="middle">
                  {inviteUrl}
                </Text>
              </View>
              <View style={styles.expiryRow}>
                <Feather name="clock" size={12} color={colors.gray400} />
                <Text style={styles.expiryText}>Expires in 7 days · tap and hold the link to copy</Text>
              </View>

              <Pressable style={[styles.primaryBtn, styles.rowBtn, styles.shareBtn]} onPress={shareLink}>
                <Feather name="share-2" size={16} color={colors.white} />
                <Text style={styles.primaryText}>Share invite link</Text>
              </Pressable>

              <Pressable style={styles.ghostBtn} onPress={() => setInviteUrl(null)}>
                <Text style={styles.ghostText}>Generate new link</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 8 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.gray200, alignSelf: 'center', marginBottom: 8 },
  flex: { flex: 1 },
  iconBlock: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  successBlock: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 16,
  },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.gray900, textAlign: 'center' },
  body: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, textAlign: 'center', lineHeight: 20, marginTop: 8, marginBottom: 28 },
  perks: { backgroundColor: colors.gray50, borderRadius: 12, padding: 14, gap: 10, marginBottom: 20 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  perkText: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray700 },
  linkBox: { backgroundColor: colors.gray50, borderRadius: 12, padding: 14, marginTop: 20 },
  linkText: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray700 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 },
  expiryText: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  primaryBtn: { backgroundColor: colors.blue600, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  shareBtn: { marginTop: 20 },
  rowBtn: { flexDirection: 'row', gap: 6 },
  btnDisabled: { opacity: 0.5 },
  primaryText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  secondaryBtn: {
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.blue600,
    borderRadius: 12,
    paddingVertical: 12.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.blue600 },
  ghostBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  ghostText: { fontFamily: fonts.medium, fontSize: 14, color: colors.gray500 },
});
