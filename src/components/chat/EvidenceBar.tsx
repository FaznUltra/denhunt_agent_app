import { useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, Text, View, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export interface EvidenceBarProps {
  onAdd: (localUri: string, type: 'photo' | 'video', contentType: string) => Promise<boolean>;
}

// Persistent bar shown during an in-progress inspection so the agent can record
// evidence that protects them if the renter later disputes.
export default function EvidenceBar({ onAdd }: EvidenceBarProps) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  async function handlePicked(res: ImagePicker.ImagePickerResult) {
    if (res.canceled || !res.assets[0]) return;
    setUploading(true);
    const ok = await onAdd(res.assets[0].uri, 'video', 'video/mp4');
    setUploading(false);
    if (ok) setDone(true);
    else Alert.alert('Upload failed', 'Check your connection and try again.');
  }

  async function recordVideo() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Please allow camera access in your device settings.');
      return;
    }
    handlePicked(await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 60 }));
  }

  async function uploadVideo() {
    handlePicked(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] }));
  }

  function openRecorder() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Record video', 'Upload from gallery', 'Cancel'], cancelButtonIndex: 2 },
        (i) => {
          if (i === 0) recordVideo();
          else if (i === 1) uploadVideo();
        },
      );
    } else {
      Alert.alert('Add evidence', undefined, [
        { text: 'Record video', onPress: recordVideo },
        { text: 'Upload from gallery', onPress: uploadVideo },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  if (done) {
    return (
      <Pressable style={[styles.bar, styles.barDone]} onPress={openRecorder}>
        <Feather name="check-circle" size={18} color={colors.successText} />
        <View style={styles.textWrap}>
          <Text style={styles.doneTitle}>Evidence recorded</Text>
          <Text style={styles.doneSub}>Tap to add more</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.bar}>
      <Feather name="video" size={18} color={colors.white} />
      <View style={styles.textWrap}>
        <Text style={styles.title}>Record inspection evidence</Text>
        <Text style={styles.sub}>Protects you if disputed</Text>
      </View>
      {uploading ? (
        <View style={styles.uploadingWrap}>
          <ActivityIndicator color={colors.white} />
          <Text style={styles.uploadingText}>Uploading…</Text>
        </View>
      ) : (
        <Pressable style={styles.recordBtn} onPress={openRecorder}>
          <Text style={styles.recordText}>Record</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.gray900,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  barDone: { backgroundColor: colors.successBg },
  textWrap: { flex: 1 },
  title: { fontFamily: fonts.medium, fontSize: 13, color: colors.white },
  sub: { fontFamily: fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  doneTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.successText },
  doneSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.successText, marginTop: 1 },
  recordBtn: { backgroundColor: colors.white, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  recordText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gray900 },
  uploadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  uploadingText: { fontFamily: fonts.medium, fontSize: 12, color: colors.white },
});
