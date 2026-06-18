import { Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

// Placeholder agent home — confirms onboarding lands here. The real dashboard
// (stat cards, listings, enquiries) is built next.
export default function AgentHome() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <Text style={styles.title}>Welcome to DenHunt 🎉</Text>
        <Text style={styles.subtitle}>
          Your account is set up. The dashboard is coming next.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.gray900,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: 8,
  },
});
