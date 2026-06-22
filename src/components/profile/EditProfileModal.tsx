import { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Avatar } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { uploadToStorage } from '@/lib/storage';
import type { AgentProfile } from '@/types/profile';

export interface EditProfileModalProps {
  visible: boolean;
  profile: AgentProfile;
  onClose: () => void;
  onSave: () => void;
}

async function processImage(uri: string): Promise<string> {
  const result = await manipulateAsync(uri, [{ resize: { width: 800, height: 800 } }], {
    compress: 0.6,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}

export default function EditProfileModal({ visible, profile, onClose, onSave }: EditProfileModalProps) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [email, setEmail] = useState(profile.email ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(profile.profile_photo_url);
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Re-seed fields each time the modal opens.
  useEffect(() => {
    if (visible) {
      setFullName(profile.full_name);
      setEmail(profile.email ?? '');
      setBio(profile.bio ?? '');
      setPhotoUri(profile.profile_photo_url);
      setNewPhotoUri(null);
    }
  }, [visible, profile]);

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Please allow camera access in your device settings.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!res.canceled) {
      const uri = await processImage(res.assets[0].uri);
      setPhotoUri(uri);
      setNewPhotoUri(uri);
    }
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
    if (!res.canceled) {
      const uri = await processImage(res.assets[0].uri);
      setPhotoUri(uri);
      setNewPhotoUri(uri);
    }
  }

  function openPhotoPicker() {
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

  async function saveProfile() {
    if (fullName.trim().length < 2) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }
    setSaving(true);
    try {
      let photoUrl = profile.profile_photo_url;
      if (newPhotoUri) {
        const url = await uploadToStorage('avatars', `${profile.id}/avatar.jpg`, newPhotoUri, 'image/jpeg');
        photoUrl = `${url}?t=${Date.now()}`; // cache-bust the CDN
      }
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          email: email.trim() || null,
          bio: bio.trim() || null,
          profile_photo_url: photoUrl,
        })
        .eq('id', profile.id);
      if (error) throw new Error(error.message);
      onSave();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Edit profile</Text>
          {saving ? (
            <ActivityIndicator size="small" color={colors.blue600} />
          ) : (
            <Pressable onPress={saveProfile}>
              <Text style={styles.save}>Save</Text>
            </Pressable>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.photoWrap}>
            <Pressable style={styles.photoPress} onPress={openPhotoPicker}>
              <Avatar name={fullName || profile.full_name} uri={photoUri} size={80} />
              <View style={styles.cameraBadge}>
                <Feather name="camera" size={13} color={colors.white} />
              </View>
            </Pressable>
            <Pressable onPress={openPhotoPicker}>
              <Text style={styles.changePhoto}>Change photo</Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Emeka Okafor"
              placeholderTextColor={colors.gray400}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email address (optional)</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.gray400}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bio (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell clients a bit about yourself..."
              placeholderTextColor={colors.gray400}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{bio.length}/300</Text>
          </View>
        </ScrollView>

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
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  cancel: { fontFamily: fonts.medium, fontSize: 15, color: colors.gray500 },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.gray900 },
  save: { fontFamily: fonts.semibold, fontSize: 15, color: colors.blue600 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  photoWrap: { alignItems: 'center', marginTop: 20, marginBottom: 24 },
  photoPress: { position: 'relative' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.blue600,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhoto: { fontFamily: fonts.medium, fontSize: 13, color: colors.blue600, marginTop: 8 },
  field: { marginBottom: 16 },
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
  inputMultiline: { height: 80 },
  counter: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginTop: 4, textAlign: 'right' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 12 },
  sheetItemText: { fontFamily: fonts.medium, fontSize: 15, color: colors.gray900 },
  sheetCancel: { marginTop: 4, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: colors.gray50 },
  sheetCancelText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.gray700 },
});
