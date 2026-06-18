import { Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

// Stub — profile screen comes in a later build.
export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <Feather name="user" size={36} color={colors.gray400} />
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Coming next</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.gray900, marginTop: 12 },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, marginTop: 4 },
});
