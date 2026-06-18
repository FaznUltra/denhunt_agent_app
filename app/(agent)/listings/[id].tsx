import { Pressable, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

// Stub — the listing detail screen is a later build.
export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.headerButton}
          onPress={() => router.back()}>
          <Feather name="chevron-left" size={20} color={colors.gray900} />
        </Pressable>
        <Text style={styles.headerTitle}>Listing detail</Text>
      </View>
      <View style={styles.center}>
        <Feather name="home" size={36} color={colors.gray400} />
        <Text style={styles.title}>Listing #{id}</Text>
        <Text style={styles.subtitle}>Coming next</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.gray900, marginLeft: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.gray900, marginTop: 12 },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, marginTop: 4 },
});
