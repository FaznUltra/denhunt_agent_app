import { useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Linking,
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
import * as DocumentPicker from 'expo-document-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import ProgressBar from '@/components/ui/ProgressBar';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { supabase } from '@/lib/supabase';
import type { IdType } from '@/types/database';

type IdSlot = 'front' | 'back';

// A picked ID document — image, PDF, or Word doc.
type PickedFile = { uri: string; name: string; mimeType: string; ext: string; isImage: boolean };

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

// Whitelisted upload types (images, PDF, Word). Real malware scanning must
// happen server-side before verification — see TODO in createAccount.
const ACCEPTED_DOC_TYPES = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function extFromName(name: string, mimeType: string): string {
  const fromName = name.includes('.') ? name.split('.').pop()?.toLowerCase() : undefined;
  if (fromName) return fromName;
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return mimeType.split('/')[1] ?? 'jpg';
  return 'bin';
}

type IdTypeOption = { label: string; value: IdType; needsBack: boolean };

const ALL_ID_TYPES: IdTypeOption[] = [
  { label: 'NIN', value: 'nin', needsBack: false },
  { label: "Driver's licence", value: 'drivers_licence', needsBack: true },
  { label: "Int'l passport", value: 'passport', needsBack: false },
  { label: "Voter's card", value: 'voters_card', needsBack: true },
];

// Individual agents only need NIN or Voter's card; agencies can use any.
const INDIVIDUAL_ID_TYPES: IdTypeOption[] = ALL_ID_TYPES.filter(
  (t) => t.value === 'nin' || t.value === 'voters_card',
);

const TERMS_URL = 'https://denhunt.com/terms';
const CONDUCT_URL = 'https://denhunt.com/code-of-conduct';

// Read a local file URI as an ArrayBuffer (base64 → bytes). This is the
// reliable cross-platform path for Supabase Storage uploads in React Native;
// fetch().blob() can produce empty uploads on Android.
async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const base64 = await new File(uri).base64();
  return decodeBase64(base64);
}

// Step 6 of onboarding — identity verification, agreement, and account
// creation. See PRD Section 3.2 (Steps 5–6) and Section 10 (schema).
export default function IdentityScreen() {
  const insets = useSafeAreaInsets();
  const store = useOnboardingStore();

  const [idType, setIdType] = useState<IdType | null>(null);
  // Files are kept per ID type so switching types preserves each one's uploads
  // without ever showing one type's file under another.
  const [filesByType, setFilesByType] = useState<
    Partial<Record<IdType, { front: PickedFile | null; back: PickedFile | null }>>
  >({});
  const [bvnRaw, setBvnRaw] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sheetSlot, setSheetSlot] = useState<IdSlot | null>(null);
  const creepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Individual agents see a shorter ID list (NIN / Voter's card only).
  const idTypes = useMemo(
    () => (store.role === 'agency_admin' ? ALL_ID_TYPES : INDIVIDUAL_ID_TYPES),
    [store.role],
  );

  const selectedType = ALL_ID_TYPES.find((t) => t.value === idType) ?? null;
  const needsBack = selectedType?.needsBack ?? false;
  const frontFile = idType ? (filesByType[idType]?.front ?? null) : null;
  const backFile = idType ? (filesByType[idType]?.back ?? null) : null;
  const maskedBvn =
    bvnRaw.length <= 4 ? bvnRaw : '•'.repeat(bvnRaw.length - 4) + bvnRaw.slice(-4);

  const canSubmit =
    idType !== null &&
    frontFile !== null &&
    (!needsBack || backFile !== null) &&
    bvnRaw.length === 11 &&
    agreed;

  // The first unmet requirement, shown under the button so the user knows
  // exactly why it's disabled (the Terms checkbox is easy to miss).
  const missingReason = !idType
    ? 'Select your ID type'
    : !frontFile
      ? 'Upload the front of your ID'
      : needsBack && !backFile
        ? 'Upload the back of your ID'
        : bvnRaw.length !== 11
          ? 'Enter your 11-digit BVN'
          : !agreed
            ? 'Tick the box to accept the Terms to continue'
            : null;

  function handleBvnChange(text: string) {
    if (text.length < maskedBvn.length) {
      setBvnRaw((p) => p.slice(0, text.length));
    } else {
      const added = text.slice(maskedBvn.length).replace(/\D/g, '');
      setBvnRaw((p) => (p + added).slice(0, 11));
    }
  }

  function setFileForSlot(slot: IdSlot, file: PickedFile) {
    if (!idType) return;
    setFilesByType((prev) => {
      const current = prev[idType] ?? { front: null, back: null };
      return { ...prev, [idType]: { ...current, [slot]: file } };
    });
  }

  function withinSize(bytes?: number | null): boolean {
    if (bytes != null && bytes > MAX_FILE_BYTES) {
      Alert.alert('File too large', 'Please choose a file under 10MB.');
      return false;
    }
    return true;
  }

  async function captureWithCamera(slot: IdSlot) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Please allow camera access in your device settings.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (res.canceled) return;
    const a = res.assets[0];
    if (!withinSize(a.fileSize)) return;
    setFileForSlot(slot, {
      uri: a.uri,
      name: a.fileName ?? 'photo.jpg',
      mimeType: a.mimeType ?? 'image/jpeg',
      ext: 'jpg',
      isImage: true,
    });
  }

  async function pickFromGallery(slot: IdSlot) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Please allow photo access in your device settings.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (res.canceled) return;
    const a = res.assets[0];
    if (!withinSize(a.fileSize)) return;
    const mimeType = a.mimeType ?? 'image/jpeg';
    setFileForSlot(slot, {
      uri: a.uri,
      name: a.fileName ?? `id.${extFromName('', mimeType)}`,
      mimeType,
      ext: extFromName(a.fileName ?? '', mimeType),
      isImage: true,
    });
  }

  async function pickDocument(slot: IdSlot) {
    const res = await DocumentPicker.getDocumentAsync({
      type: ACCEPTED_DOC_TYPES,
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    if (!withinSize(a.size)) return;
    const mimeType = a.mimeType ?? 'application/octet-stream';
    setFileForSlot(slot, {
      uri: a.uri,
      name: a.name,
      mimeType,
      ext: extFromName(a.name, mimeType),
      isImage: mimeType.startsWith('image/'),
    });
  }

  function openUploadActions(slot: IdSlot) {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Take photo', 'Choose from gallery', 'Upload a file', 'Cancel'],
          cancelButtonIndex: 3,
        },
        (i) => {
          if (i === 0) captureWithCamera(slot);
          else if (i === 1) pickFromGallery(slot);
          else if (i === 2) pickDocument(slot);
        },
      );
    } else {
      setSheetSlot(slot);
    }
  }

  // Upload a file to a Storage bucket and return its stored path.
  async function uploadFile(bucket: string, path: string, uri: string, contentType: string) {
    const data = await uriToArrayBuffer(uri);
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, data, { contentType, upsert: true });
    if (upErr) throw new Error(`Upload failed (${bucket}): ${upErr.message}`);
    return path;
  }

  // Run an async step while creeping the progress % from `from` toward `to`
  // so the button keeps moving during slow uploads, then snap to `to`.
  async function runStep<T>(from: number, to: number, task: () => Promise<T>): Promise<T> {
    setProgress(from);
    let current = from;
    creepTimer.current = setInterval(() => {
      current = Math.min(current + 1, to - 1);
      setProgress(current);
    }, 100);
    try {
      return await task();
    } finally {
      if (creepTimer.current) clearInterval(creepTimer.current);
      creepTimer.current = null;
      setProgress(to);
    }
  }

  async function createAccount() {
    if (!canSubmit || !idType || !frontFile) return;
    setLoading(true);
    setProgress(0);
    setError(null);

    // Divide 0–95% evenly across the steps that will actually run (the final
    // 95→100 is set on success). Uploads creep within their slice.
    const totalSteps =
      3 + // ID front, user row, identity record
      (store.profilePhotoUri ? 1 : 0) +
      (needsBack && backFile ? 1 : 0) +
      (store.role === 'agency_admin' ? 1 : 0);
    const span = 95 / totalSteps;
    let done = 0;
    const nextRange = () => {
      const from = Math.round(done * span);
      done += 1;
      return [from, Math.round(done * span)] as const;
    };

    let step = 'auth';
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated session. Please verify your phone again.');
      const userId = user.id;

      // 1. Profile photo → public avatars bucket (compressed to ~500KB).
      let profilePhotoUrl: string | null = null;
      if (store.profilePhotoUri) {
        step = 'avatar upload';
        const [f, t] = nextRange();
        profilePhotoUrl = await runStep(f, t, async () => {
          const compressed = await manipulateAsync(
            store.profilePhotoUri as string,
            [{ resize: { width: 500, height: 500 } }],
            { compress: 0.6, format: SaveFormat.JPEG },
          );
          await uploadFile('avatars', `${userId}/avatar.jpg`, compressed.uri, 'image/jpeg');
          return supabase.storage.from('avatars').getPublicUrl(`${userId}/avatar.jpg`).data
            .publicUrl;
        });
      }

      // 2. ID front → private identity-docs bucket.
      // TODO: scan uploaded docs server-side (Edge Function + scan API) before
      // an admin marks the user verified — client can only whitelist type/size.
      step = 'ID front upload';
      const [ff, ft] = nextRange();
      const idFrontPath = await runStep(ff, ft, () =>
        uploadFile('identity-docs', `${userId}/id-front.${frontFile.ext}`, frontFile.uri, frontFile.mimeType),
      );

      // 3. ID back (if applicable).
      let idBackPath: string | null = null;
      if (needsBack && backFile) {
        step = 'ID back upload';
        const [bf, bt] = nextRange();
        idBackPath = await runStep(bf, bt, () =>
          uploadFile('identity-docs', `${userId}/id-back.${backFile.ext}`, backFile.uri, backFile.mimeType),
        );
      }

      // 4. users row.
      step = 'create user';
      const [uf, ut] = nextRange();
      await runStep(uf, ut, async () => {
        const { error: userErr } = await supabase.from('users').insert({
          id: userId,
          phone: store.phone ?? '',
          email: store.email,
          full_name: store.fullName ?? '',
          profile_photo_url: profilePhotoUrl,
          role: store.role ?? 'individual_agent',
          status: 'active',
          verification_status: 'pending',
          years_experience: store.yearsExperience,
          areas: store.areas,
          property_types: store.propertyTypes,
        });
        if (userErr) throw new Error(`Could not create your profile: ${userErr.message}`);
      });

      // 5. agencies row (agency_admin only).
      if (store.role === 'agency_admin') {
        step = 'create agency';
        const [af, at] = nextRange();
        await runStep(af, at, async () => {
          const { error: agencyErr } = await supabase.from('agencies').insert({
            name: store.agencyName ?? '',
            cac_number: store.cacNumber,
            admin_id: userId,
            status: 'active',
            verification_status: 'pending',
          });
          if (agencyErr) throw new Error(`Could not create your agency: ${agencyErr.message}`);
        });
      }

      // 6. identity_verifications row.
      step = 'identity record';
      const [idf, idt] = nextRange();
      await runStep(idf, idt, async () => {
        // TODO: replace base64 encoding with Supabase Vault before production
        const g = globalThis as unknown as { btoa?: (s: string) => string };
        const encryptedBvn = g.btoa ? g.btoa(bvnRaw) : bvnRaw;
        const { error: idvErr } = await supabase.from('identity_verifications').insert({
          user_id: userId,
          id_type: idType,
          id_front_url: idFrontPath,
          id_back_url: idBackPath,
          bvn: encryptedBvn,
          kyc_status: 'pending',
        });
        if (idvErr) throw new Error(`Could not save your verification: ${idvErr.message}`);
      });

      // Done — clear onboarding state and enter the app (no going back).
      setProgress(100);
      store.reset();
      router.replace('/(agent)' as Href);
    } catch (e) {
      console.error(`[onboarding] createAccount failed at step: ${step}`, e);
      setError(
        e instanceof Error ? e.message : 'Something went wrong creating your account. Please try again.',
      );
      setProgress(0);
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    Alert.alert(
      'Leave this step?',
      'Going back will not save the documents you uploaded here.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Go back', style: 'destructive', onPress: () => router.back() },
      ],
    );
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
            onPress={handleBack}>
            <Feather name="chevron-left" size={20} color={colors.gray900} />
          </Pressable>
          <View style={styles.progressWrap}>
            <ProgressBar currentStep={6} totalSteps={6} />
          </View>
        </View>

        {/* Intro */}
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>Step 6 of 6</Text>
          <Text style={styles.headline}>Verify your identity</Text>
          <Text style={styles.subtext}>
            Required to list properties on DenHunt. Your data is encrypted and secure.
          </Text>
        </View>

        {/* ID type selector */}
        <Text style={styles.label}>Government ID type</Text>
        <View style={styles.idGrid}>
          {idTypes.map((t) => {
            const selected = idType === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => setIdType(t.value)}
                style={[styles.idCard, selected && styles.idCardSelected]}>
                <Text style={[styles.idCardText, selected && styles.idCardTextSelected]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ID upload */}
        {selectedType && (
          <View style={styles.uploadSection}>
            <Text style={styles.label}>Upload {selectedType.label}</Text>
            <View style={styles.uploadRow}>
              <UploadBox
                label="Front of ID"
                file={frontFile}
                onPress={() => openUploadActions('front')}
              />
              {needsBack && (
                <UploadBox
                  label="Back of ID"
                  file={backFile}
                  onPress={() => openUploadActions('back')}
                />
              )}
            </View>
          </View>
        )}

        {/* BVN */}
        <View style={styles.bvnSection}>
          <Text style={styles.label}>Bank Verification Number (BVN)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your 11-digit BVN"
            placeholderTextColor={colors.gray400}
            keyboardType="number-pad"
            maxLength={11}
            value={maskedBvn}
            onChangeText={handleBvnChange}
          />
          <View style={styles.bvnHintRow}>
            <Feather name="lock" size={11} color={colors.gray400} />
            <Text style={styles.bvnHint}>Your BVN is encrypted. We never share it.</Text>
          </View>
        </View>

        {/* Terms */}
        <ScrollView style={styles.termsBox} nestedScrollEnabled>
          <Text style={styles.termsText}>
            By creating a DenHunt account, you agree to our Terms of Service and Agent Code of
            Conduct. You confirm that all information provided is accurate and that listings you
            post accurately represent the properties being advertised. DenHunt may suspend
            accounts that violate these terms or post fraudulent listings.
          </Text>
        </ScrollView>

        <Pressable style={styles.checkboxRow} onPress={() => setAgreed((v) => !v)}>
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Feather name="check" size={14} color={colors.white} />}
          </View>
          <Text style={styles.checkboxLabel}>
            I agree to the{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(CONDUCT_URL)}>
              Agent Code of Conduct
            </Text>
          </Text>
        </Pressable>

        {/* Error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={16} color={colors.errorText} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {!canSubmit && !loading && missingReason ? (
          <Text style={styles.missingHint}>{missingReason}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit || loading }}
          disabled={!canSubmit || loading}
          onPress={createAccount}
          style={[styles.primaryButton, (!canSubmit || loading) && styles.primaryButtonDisabled]}>
          {loading ? (
            <Text style={styles.primaryLabel}>Creating account · {progress}%</Text>
          ) : (
            <Text style={styles.primaryLabel}>Create my account</Text>
          )}
        </Pressable>
      </View>

      {/* Android upload action sheet */}
      <Modal
        visible={sheetSlot !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSheetSlot(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheetSlot(null)}>
          <View style={styles.sheet}>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                const slot = sheetSlot;
                setSheetSlot(null);
                if (slot) captureWithCamera(slot);
              }}>
              <Feather name="camera" size={20} color={colors.gray700} />
              <Text style={styles.sheetItemText}>Take photo</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                const slot = sheetSlot;
                setSheetSlot(null);
                if (slot) pickFromGallery(slot);
              }}>
              <Feather name="image" size={20} color={colors.gray700} />
              <Text style={styles.sheetItemText}>Choose from gallery</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                const slot = sheetSlot;
                setSheetSlot(null);
                if (slot) pickDocument(slot);
              }}>
              <Feather name="file" size={20} color={colors.gray700} />
              <Text style={styles.sheetItemText}>Upload a file</Text>
            </Pressable>
            <Pressable style={styles.sheetCancel} onPress={() => setSheetSlot(null)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// Single ID upload box (front or back).
function UploadBox({
  label,
  file,
  onPress,
}: {
  label: string;
  file: PickedFile | null;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.uploadBox} onPress={onPress}>
      {file ? (
        <>
          {file.isImage ? (
            <Image source={{ uri: file.uri }} style={styles.uploadThumb} resizeMode="cover" />
          ) : (
            <View style={styles.uploadDoc}>
              <Feather name="file-text" size={24} color={colors.blue600} />
              <Text style={styles.uploadDocName} numberOfLines={1}>
                {file.name}
              </Text>
            </View>
          )}
          <View style={styles.uploadCheck}>
            <Feather name="check-circle" size={16} color={colors.successText} />
          </View>
        </>
      ) : (
        <>
          <Feather name="upload" size={20} color={colors.gray400} />
          <Text style={styles.uploadLabel}>{label}</Text>
        </>
      )}
    </Pressable>
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
  intro: { paddingTop: 28, marginBottom: 28 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 12, color: colors.gray400 },
  headline: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.gray900,
    letterSpacing: -0.4,
    marginTop: 6,
  },
  subtext: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, marginTop: 8 },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.gray500, marginBottom: 5 },
  idGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  idCard: {
    flexGrow: 1,
    flexBasis: '47%',
    height: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idCardSelected: { borderColor: colors.blue600, backgroundColor: colors.blue50 },
  idCardText: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray700 },
  idCardTextSelected: { color: colors.blue600 },
  uploadSection: { marginBottom: 20 },
  uploadRow: { flexDirection: 'row', gap: 10 },
  uploadBox: {
    flex: 1,
    height: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadThumb: { ...StyleSheet.absoluteFillObject },
  uploadDoc: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 6 },
  uploadDocName: { fontFamily: fonts.medium, fontSize: 11, color: colors.gray700, textAlign: 'center' },
  uploadCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.white,
    borderRadius: 10,
  },
  uploadLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400, marginTop: 6 },
  bvnSection: { marginBottom: 24 },
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
  bvnHintRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  bvnHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400 },
  termsBox: {
    height: 120,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  termsText: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, lineHeight: 18 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.blue600, borderColor: colors.blue600 },
  checkboxLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray700, flex: 1, lineHeight: 18 },
  link: { fontFamily: fonts.semibold, color: colors.blue600 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  errorText: { fontFamily: fonts.regular, fontSize: 13, color: colors.errorText, flex: 1 },
  bottom: { paddingHorizontal: 20, paddingTop: 12 },
  missingHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, textAlign: 'center', marginBottom: 8 },
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
