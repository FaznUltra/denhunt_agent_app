import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import ProgressBar from '@/components/ui/ProgressBar';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { signInWithPhone, verifyOTP } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const BOXES = Array.from({ length: OTP_LENGTH }, (_, i) => i);

// Format +234XXXXXXXXXX as local "0XX XXXX XXXX" for display.
function formatLocal(international: string): string {
  const digits = international.replace(/\D/g, '');
  const local = digits.startsWith('234') ? `0${digits.slice(3)}` : digits;
  if (local.length !== 11) return international;
  return `${local.slice(0, 3)} ${local.slice(3, 7)} ${local.slice(7, 11)}`;
}

// Step 3 of onboarding — OTP verification. See PRD Section 3.2 (Step 2).
export default function OTPScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phone: string; isReturning?: string }>();
  const phone = params.phone ?? '';
  const isReturning = params.isReturning === 'true';
  const resetOnboarding = useOnboardingStore((s) => s.reset);

  const [otp, setOtp] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);
  const submittingRef = useRef(false);

  // Resend countdown.
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  async function handleVerify(code: string) {
    if (submittingRef.current) return;
    if (code.length !== OTP_LENGTH) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await verifyOTP(phone, code);

      if (isReturning) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        let profileComplete = false;
        if (user) {
          const { data } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();
          profileComplete = !!data?.full_name;
        }
        if (profileComplete) {
          resetOnboarding();
          router.replace('/(agent)' as Href);
        } else {
          router.replace('/(auth)/profile' as Href);
        }
      } else {
        router.replace('/(auth)/profile' as Href);
      }
    } catch {
      setOtp('');
      setError('Incorrect or expired code. Please try again.');
      requestAnimationFrame(() => inputRef.current?.focus());
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  function handleChange(text: string) {
    const next = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(next);
    if (error) setError(null);
    if (next.length === OTP_LENGTH) handleVerify(next);
  }

  async function handleResend() {
    if (countdown > 0) return;
    setError(null);
    try {
      await signInWithPhone(phone);
      setOtp('');
      setCountdown(RESEND_SECONDS);
      setResent(true);
      setTimeout(() => setResent(false), 3000);
      inputRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend code. Please try again.');
    }
  }

  const mm = Math.floor(countdown / 60);
  const ss = String(countdown % 60).padStart(2, '0');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
            onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color={colors.gray900} />
          </Pressable>
          {!isReturning && (
            <View style={styles.progressWrap}>
              <ProgressBar currentStep={3} totalSteps={6} />
            </View>
          )}
        </View>

        {/* Intro */}
        <View style={styles.intro}>
          {!isReturning && <Text style={styles.eyebrow}>Step 3 of 6</Text>}
          <Text style={styles.headline}>{'Enter the code\nwe sent you'}</Text>
          <Text style={styles.subtext}>Sent to {formatLocal(phone)}</Text>
        </View>

        {/* OTP boxes (single hidden input captures keypresses) */}
        <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
          {BOXES.map((i) => {
            const char = otp[i] ?? '';
            const isFilled = i < otp.length;
            const isActive = focused && i === otp.length;
            return (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  isActive && styles.otpBoxActive,
                  isFilled && styles.otpBoxFilled,
                ]}>
                <Text style={styles.otpDigit}>{char}</Text>
              </View>
            );
          })}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            autoFocus
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </Pressable>

        {/* Resend row */}
        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <Text style={styles.resendMuted}>
              Resend code in {mm}:{ss}
            </Text>
          ) : (
            <Text style={styles.resendMuted}>
              Didn&apos;t get a code?{' '}
              <Text style={styles.resendLink} onPress={handleResend}>
                Resend
              </Text>
            </Text>
          )}
        </View>

        {/* Success banner */}
        {resent && (
          <View style={styles.successBanner}>
            <Feather name="check-circle" size={16} color={colors.successText} />
            <Text style={styles.successText}>Code resent successfully</Text>
          </View>
        )}

        {/* Error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={16} color={colors.errorText} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Bottom CTA */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: otp.length < OTP_LENGTH || loading }}
            disabled={otp.length < OTP_LENGTH || loading}
            onPress={() => handleVerify(otp)}
            style={[
              styles.primaryButton,
              (otp.length < OTP_LENGTH || loading) && styles.primaryButtonDisabled,
            ]}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryLabel}>Verify</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, paddingHorizontal: 20 },
  header: { paddingTop: 16 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressWrap: { marginTop: 16 },
  intro: { paddingTop: 28 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 12, color: colors.gray400 },
  headline: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.gray900,
    letterSpacing: -0.4,
    lineHeight: 32,
    marginTop: 6,
  },
  subtext: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.gray500,
    marginTop: 8,
    marginBottom: 32,
  },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: { borderColor: colors.blue600 },
  otpBoxFilled: { borderColor: colors.blue600, backgroundColor: colors.blue50 },
  otpDigit: { fontFamily: fonts.bold, fontSize: 24, color: colors.gray900, textAlign: 'center' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  resendRow: { marginTop: 20, alignItems: 'center' },
  resendMuted: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray400, textAlign: 'center' },
  resendLink: { fontFamily: fonts.semibold, fontSize: 13, color: colors.blue600 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  successText: { fontFamily: fonts.regular, fontSize: 13, color: colors.successText, flex: 1 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  errorText: { fontFamily: fonts.regular, fontSize: 13, color: colors.errorText, flex: 1 },
  bottom: { marginTop: 'auto' },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.blue600,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
});
