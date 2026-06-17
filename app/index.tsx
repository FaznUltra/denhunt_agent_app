import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router, type Href } from 'expo-router';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { getSession } from '@/lib/auth';

// Routes are built screen-by-screen; these targets may not exist yet.
const AGENT_HOME = '/(agent)' as Href;
const ROLE_SELECT = '/(auth)/role-select' as Href;
// isReturning lets the phone screen skip onboarding and go straight to OTP.
const SIGN_IN = '/(auth)/phone?isReturning=true' as Href;

type FeatureRow = {
  icon: keyof typeof Feather.glyphMap;
  text: string;
};

const FEATURES: FeatureRow[] = [
  { icon: 'shield', text: 'Verified identity & listing review' },
  { icon: 'lock', text: 'Inspection fees held safely in escrow' },
  { icon: 'users', text: 'Real clients, not time-wasters' },
];

// Brand icon mark — navy "D"/house on a transparent background, reads well on light.
const LOGO_MARK = require('../assets/logo/04_Icon_Mark/Denhunt_Icon_Mark_Color_Transparent.png');

// First screen a new user sees. Redirects authenticated users straight to the
// agent dashboard; otherwise shows the welcome screen.
// See docs/denhunt-design-system.md and PRD Section 3 (Onboarding).
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [checkingSession, setCheckingSession] = useState(true);
  const fade = useRef(new Animated.Value(0)).current;

  // Check for an existing Supabase session before showing the welcome content.
  useEffect(() => {
    let mounted = true;
    getSession()
      .then((session) => {
        if (!mounted) return;
        if (session) {
          router.replace(AGENT_HOME);
        } else {
          setCheckingSession(false);
        }
      })
      .catch(() => {
        if (mounted) setCheckingSession(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Clean opacity fade-in once the welcome content is ready to show.
  useEffect(() => {
    if (!checkingSession && fontsLoaded) {
      Animated.timing(fade, {
        toValue: 1,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [checkingSession, fontsLoaded, fade]);

  function handleGetStarted() {
    router.push(ROLE_SELECT);
  }

  function handleSignIn() {
    router.push(SIGN_IN);
  }

  // Font guard (root layout also gates on fonts, but guard here too).
  if (!fontsLoaded) {
    return null;
  }

  // Loading state: white screen with the logo mark centred — no content flash.
  if (checkingSession) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Image source={LOGO_MARK} style={styles.logoMark} resizeMode="contain" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Animated.View style={[styles.fadeContainer, { opacity: fade }]}>
        <View style={styles.topSection}>
          <Image source={LOGO_MARK} style={styles.logoMark} resizeMode="contain" />

          <Text style={styles.appLabel}>DenHunt Agent</Text>

          <Text style={styles.headline}>{'List. Get found.\nClose deals.'}</Text>

          <Text style={styles.subtext}>
            The professional platform for Nigerian real estate agents.
          </Text>

          <View style={styles.featureList}>
            {FEATURES.map((feature) => (
              <View key={feature.icon} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Feather name={feature.icon} size={15} color={colors.blue600} />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ paddingBottom: insets.bottom + 16 }}>
          <Pressable
            accessibilityRole="button"
            style={styles.primaryButton}
            onPress={handleGetStarted}>
            <Text style={styles.primaryButtonLabel}>Get started</Text>
          </Pressable>

          <Text style={styles.signInRow}>
            Already have an account?{' '}
            <Text
              accessibilityRole="link"
              style={styles.signInLink}
              onPress={handleSignIn}>
              Sign in
            </Text>
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fadeContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
  },
  logoMark: {
    width: 56,
    height: 56,
  },
  appLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.blue600,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 20,
  },
  headline: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: colors.gray900,
    letterSpacing: -0.5,
    lineHeight: 36,
    marginTop: 10,
  },
  subtext: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.gray500,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 32,
  },
  featureList: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.gray700,
  },
  primaryButton: {
    backgroundColor: colors.blue600,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.white,
    letterSpacing: 0,
  },
  signInRow: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.gray400,
    textAlign: 'center',
    marginTop: 12,
  },
  signInLink: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.blue600,
  },
});
