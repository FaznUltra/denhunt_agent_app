import { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import ProgressBar from '@/components/ui/ProgressBar';
import { useOnboardingStore } from '@/stores/onboardingStore';

// Compress + square-crop a picked image to 800x800 JPEG (well under 1.5MB).
async function processImage(uri: string): Promise<string> {
  const result = await manipulateAsync(uri, [{ resize: { width: 800, height: 800 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}

// Step 4 of onboarding — basic profile. See PRD Section 3.2 (Step 3).
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const profilePhotoUri = useOnboardingStore((s) => s.profilePhotoUri);
  const setProfilePhotoUri = useOnboardingStore((s) => s.setProfilePhotoUri);
  const setFullName = useOnboardingStore((s) => s.setFullName);
  const setEmail = useOnboardingStore((s) => s.setEmail);

  const [fullName, setFullNameLocal] = useState('');
  const [email, setEmailLocal] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const canContinue = fullName.trim().length >= 2;

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Please allow camera access in your device settings.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!res.canceled) setProfilePhotoUri(await processImage(res.assets[0].uri));
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Please allow photo access in your device settings.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!res.canceled) setProfilePhotoUri(await processImage(res.assets[0].uri));
  }

  function openPhotoActions() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Take photo', 'Choose from gallery', 'Cancel'], cancelButtonIndex: 2 },
        (i) => {
          if (i === 0) pickFromCamera();
          else if (i === 1) pickFromGallery();
        },
      );
    } else {
      setSheetOpen(true);
    }
  }

  function handleContinue() {
    setFullName(fullName.trim());
    if (email.trim()) setEmail(email.trim());
    router.push('/(auth)/professional' as Href);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
            onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color={colors.gray900} />
          </Pressable>
          <View style={styles.progressWrap}>
            <ProgressBar currentStep={4} totalSteps={6} />
          </View>
        </View>

        {/* Intro */}
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>Step 4 of 6</Text>
          <Text style={styles.headline}>Set up your profile</Text>
          <Text style={styles.subtext}>This is how clients will see you on DenHunt.</Text>
        </View>

        {/* Photo picker */}
        <View style={styles.photoWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add profile photo"
            style={styles.photoCircle}
            onPress={openPhotoActions}>
            {profilePhotoUri ? (
              <>
                <Image source={{ uri: profilePhotoUri }} style={styles.photoImage} />
                <View style={styles.photoOverlay}>
                  <Feather name="camera" size={16} color={colors.white} />
                </View>
              </>
            ) : (
              <Feather name="camera" size={28} color={colors.blue600} />
            )}
          </Pressable>
        </View>

        {/* Full name */}
        <View style={styles.field}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Emeka Okafor"
            placeholderTextColor={colors.gray400}
            value={fullName}
            onChangeText={setFullNameLocal}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Email address (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.gray400}
            value={email}
            onChangeText={setEmailLocal}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>Used for account recovery only</Text>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue }}
          disabled={!canContinue}
          onPress={handleContinue}
          style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}>
          <Text style={styles.primaryLabel}>Continue</Text>
        </Pressable>
      </View>

      {/* Android photo action sheet */}
      <Modal visible={sheetOpen} transparent animationType="fade" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheetOpen(false)}>
          <View style={styles.sheet}>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setSheetOpen(false);
                pickFromCamera();
              }}>
              <Feather name="camera" size={20} color={colors.gray700} />
              <Text style={styles.sheetItemText}>Take photo</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setSheetOpen(false);
                pickFromGallery();
              }}>
              <Feather name="image" size={20} color={colors.gray700} />
              <Text style={styles.sheetItemText}>Choose from gallery</Text>
            </Pressable>
            <Pressable style={styles.sheetCancel} onPress={() => setSheetOpen(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
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
    marginTop: 6,
  },
  subtext: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.gray500,
    marginTop: 8,
    marginBottom: 32,
  },
  photoWrap: { alignItems: 'center', marginBottom: 28 },
  photoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: { width: 88, height: 88, borderRadius: 44 },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: { marginBottom: 20 },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.gray500, marginBottom: 5 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.gray900,
  },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray400, fontStyle: 'italic', marginTop: 6 },
  bottom: { paddingHorizontal: 20, paddingTop: 12 },
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
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 12 },
  sheetItemText: { fontFamily: fonts.medium, fontSize: 15, color: colors.gray900 },
  sheetCancel: { marginTop: 4, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: colors.gray50 },
  sheetCancelText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.gray700 },
});
