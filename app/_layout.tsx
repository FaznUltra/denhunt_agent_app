import '../global.css';

import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { router, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import type { Session } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

// Matches both the universal link and the custom scheme, scheme-agnostically:
// .../invite/<64-hex-token>
const INVITE_RE = /\/invite\/([a-f0-9]{64})/;

function handleDeepLink(url: string) {
  const match = url.match(INVITE_RE);
  if (match) {
    router.push(`/(auth)/accept-invite?token=${match[1]}` as Parameters<typeof router.push>[0]);
  }
}

// DenHunt is light mode only — see docs/denhunt-design-system.md
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // undefined = auth state not resolved yet; null = signed out; Session = signed in.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const segments = useSegments();
  const navRouter = useRouter();

  // Single source of truth for auth — driven by live auth events (never stale).
  useEffect(() => {
    getSession().then(setSession);
    const sub = onAuthStateChange((s) => setSession(s));
    return () => sub.unsubscribe();
  }, []);

  const ready = fontsLoaded && session !== undefined;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Reactive route guard. Redirect off the live session, not a one-shot read,
  // so sign-out can never be undone by a stale session check.
  useEffect(() => {
    if (!ready) return;
    const group = segments[0]; // '(agent)' | '(auth)' | undefined (welcome at '/')
    if (!session && group === '(agent)') {
      navRouter.replace('/');
    } else if (session && group === undefined) {
      // Signed-in user landed on the welcome screen → go straight to the app.
      // (Onboarding lives under (auth), so it is intentionally not redirected.)
      navRouter.replace('/(agent)');
    }
  }, [ready, session, segments, navRouter]);

  // Agency invite deep links (denhunt://invite/… or https://denhunt.com/invite/…).
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    return () => sub.remove();
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="dark" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
