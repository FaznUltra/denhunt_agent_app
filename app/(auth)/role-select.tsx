import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router, type Href } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import ProgressBar from '@/components/ui/ProgressBar';
import {
  useOnboardingStore,
  type OnboardingRole,
} from '@/stores/onboardingStore';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type RoleOption = {
  role: OnboardingRole;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'individual_agent',
    icon: 'user',
    title: 'Individual agent',
    subtitle: 'I post my own listings and manage my own clients',
  },
  {
    role: 'agency_admin',
    icon: 'briefcase',
    title: 'Real estate agency',
    subtitle: 'I manage a team of agents under one agency account',
  },
];

// First onboarding decision gate: who is the user? Sets the account role.
// See PRD Section 3.1 and docs/denhunt-design-system.md.
export default function RoleSelectScreen() {
  const insets = useSafeAreaInsets();
  const setRole = useOnboardingStore((s) => s.setRole);
  const [selected, setSelected] = useState<OnboardingRole | null>(null);

  // One scale value per card for the tap "press" animation.
  const scales = useRef<Record<OnboardingRole, Animated.Value>>({
    individual_agent: new Animated.Value(1),
    agency_admin: new Animated.Value(1),
  }).current;
  // Continue button fades from disabled (0.4) to enabled (1) on first select.
  const buttonOpacity = useRef(new Animated.Value(0.4)).current;

  function handleSelect(role: OnboardingRole) {
    setSelected(role);

    Animated.sequence([
      Animated.spring(scales[role], {
        toValue: 0.98,
        useNativeDriver: true,
      }),
      Animated.spring(scales[role], {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(buttonOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }

  function handleContinue() {
    if (!selected) return;
    setRole(selected);
    router.push(`/(auth)/phone?role=${selected}` as Href);
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
        </View>

        {/* Intro */}
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>Step 1 of 6</Text>
          <View style={styles.progressWrap}>
            <ProgressBar currentStep={1} totalSteps={6} />
          </View>
          <Text style={styles.headline}>{'What brings you\nto DenHunt?'}</Text>
          <Text style={styles.subtext}>
            Choose how you&apos;ll be using the app. You can&apos;t change this later.
          </Text>
        </View>

        {/* Role cards */}
        <View style={styles.cards}>
          {ROLE_OPTIONS.map((option) => {
            const isSelected = selected === option.role;
            return (
              <AnimatedPressable
                key={option.role}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => handleSelect(option.role)}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                  { transform: [{ scale: scales[option.role] }] },
                ]}>
                <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
                  <Feather
                    name={option.icon}
                    size={24}
                    color={isSelected ? colors.white : colors.gray500}
                  />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{option.title}</Text>
                  <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
                </View>
                <Feather
                  name="check-circle"
                  size={20}
                  color={colors.blue600}
                  style={isSelected ? styles.checkVisible : styles.checkHidden}
                />
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Continue */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !selected }}
            disabled={!selected}
            onPress={handleContinue}
            style={[styles.continueButton, { opacity: buttonOpacity }]}>
            <Text style={styles.continueLabel}>Continue</Text>
          </AnimatedPressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: {
    paddingTop: 32,
  },
  eyebrow: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.gray400,
  },
  progressWrap: {
    marginTop: 10,
  },
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
  cards: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  cardSelected: {
    borderColor: colors.blue600,
    backgroundColor: colors.blue50,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxSelected: {
    backgroundColor: colors.blue600,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.gray900,
  },
  cardSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.gray500,
    marginTop: 3,
    lineHeight: 18,
  },
  checkVisible: {
    opacity: 1,
  },
  checkHidden: {
    opacity: 0,
  },
  bottom: {
    marginTop: 'auto',
  },
  continueButton: {
    width: '100%',
    backgroundColor: colors.blue600,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.white,
  },
});
