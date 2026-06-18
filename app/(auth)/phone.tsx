import { useRef, useState } from 'react';
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
import { useOnboardingStore, type OnboardingRole } from '@/stores/onboardingStore';
import { signInWithPhone } from '@/lib/auth';

// Strip everything but digits.
function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

// Normalise a Nigerian mobile number to 11-digit local format (leading 0).
// Returns null if it isn't a valid Nigerian mobile number.
function normaliseNigerian(raw: string): string | null {
  const d = digitsOnly(raw);
  if (/^0[789]\d{9}$/.test(d)) return d; // 11 digits, leading 0
  if (/^[789]\d{9}$/.test(d)) return `0${d}`; // 10 digits, missing leading 0
  return null;
}

// Convert 11-digit local (0XXXXXXXXXX) to E.164 (+234XXXXXXXXXX).
function toInternational(normalised: string): string {
  return `+234${normalised.slice(1)}`;
}

// Step 2 of onboarding — phone number entry. Doubles as the returning-user
// sign-in entry. See PRD Section 3.2 (Step 1) and docs/denhunt-design-system.md.
export default function PhoneScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ role?: OnboardingRole; isReturning?: string }>();
  const isReturning = params.isReturning === 'true';

  // role is set on the store by role-select; phone only forwards isReturning.
  const setPhone = useOnboardingStore((s) => s.setPhone);

  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const normalised = normaliseNigerian(value);
  const isValid = normalised !== null;
  const hasTenDigits = digitsOnly(value).length >= 10;
  const showValidationHint = hasAttempted && !isValid;

  async function handleSendCode() {
    setHasAttempted(true);
    setError(null);
    if (!normalised) return;

    const international = toInternational(normalised);
    setLoading(true);
    try {
      await signInWithPhone(international);
      setPhone(normalised);
      router.push(
        `/(auth)/otp?phone=${encodeURIComponent(international)}&isReturning=${isReturning}` as Href,
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

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
              <ProgressBar currentStep={2} totalSteps={6} />
            </View>
          )}
        </View>

        {/* Intro */}
        <View style={styles.intro}>
          {!isReturning && <Text style={styles.eyebrow}>Step 2 of 6</Text>}
          <Text style={styles.headline}>
            {isReturning ? 'Welcome back' : "What's your\nphone number?"}
          </Text>
          <Text style={styles.subtext}>
            {isReturning
              ? 'Enter your number to sign in to your account.'
              : "We'll send a verification code to confirm it's really you."}
          </Text>
        </View>

        {/* Phone input row */}
        <View style={styles.inputRow}>
          <View style={styles.countryPill}>
            <Text style={styles.countryText}>🇳🇬 +234</Text>
          </View>
          <TextInput
            ref={inputRef}
            style={[styles.numberInput, error ? styles.numberInputError : null]}
            placeholder="800 000 0000"
            placeholderTextColor={colors.gray400}
            keyboardType="phone-pad"
            autoFocus
            value={value}
            onChangeText={(t) => {
              setValue(t);
              if (error) setError(null);
            }}
            returnKeyType="done"
            onSubmitEditing={handleSendCode}
          />
        </View>

        {/* Validation hint */}
        {showValidationHint && (
          <Text style={styles.validationHint}>Enter a valid Nigerian mobile number</Text>
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
            accessibilityState={{ disabled: !hasTenDigits || loading }}
            disabled={!hasTenDigits || loading}
            onPress={handleSendCode}
            style={[styles.primaryButton, (!hasTenDigits || loading) && styles.primaryButtonDisabled]}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryLabel}>Send code</Text>
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
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 32,
  },
  inputRow: { flexDirection: 'row', gap: 8 },
  countryPill: {
    width: 76,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryText: { fontFamily: fonts.medium, fontSize: 14, color: colors.gray900 },
  numberInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.gray900,
  },
  numberInputError: { borderColor: colors.errorText },
  validationHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.errorText,
    marginTop: 8,
  },
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
