import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { SectionLabel } from '@/components/ui';
import { Pill } from '@/components/listings/Pill';
import { AREA_OPTIONS, EXPERIENCE_OPTIONS, SPECIALISATIONS } from '@/constants/listingOptions';
import { supabase } from '@/lib/supabase';
import type { AgentProfile } from '@/types/profile';

export interface EditProfessionalModalProps {
  visible: boolean;
  profile: AgentProfile;
  onClose: () => void;
  onSave: () => void;
}

export default function EditProfessionalModal({ visible, profile, onClose, onSave }: EditProfessionalModalProps) {
  const [years, setYears] = useState<string | null>(profile.years_experience);
  const [areas, setAreas] = useState<string[]>(profile.areas);
  const [types, setTypes] = useState<string[]>(profile.property_types);
  const [areaDrawerOpen, setAreaDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setYears(profile.years_experience);
      setAreas(profile.areas);
      setTypes(profile.property_types);
    }
  }, [visible, profile]);

  const filteredAreas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q === '' ? AREA_OPTIONS : AREA_OPTIONS.filter((a) => a.toLowerCase().includes(q));
  }, [query]);

  function toggleArea(area: string) {
    setAreas((prev) => (prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]));
  }
  function toggleType(value: string) {
    setTypes((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ years_experience: years, areas, property_types: types })
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
          <Text style={styles.title}>Professional details</Text>
          {saving ? (
            <ActivityIndicator size="small" color={colors.blue600} />
          ) : (
            <Pressable onPress={save}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SectionLabel text="Years of experience" />
          <View style={styles.pillWrap}>
            {EXPERIENCE_OPTIONS.map((opt) => (
              <Pill key={opt} label={opt} selected={years === opt} onPress={() => setYears(opt)} />
            ))}
          </View>

          <View style={styles.sectionGap}>
            <SectionLabel text="Areas you cover" />
          </View>
          <Pressable style={styles.selector} onPress={() => setAreaDrawerOpen(true)}>
            <Text style={areas.length ? styles.selectorText : styles.selectorPlaceholder}>
              {areas.length ? `${areas.length} area${areas.length > 1 ? 's' : ''} selected` : 'Select states or areas'}
            </Text>
            <Feather name="chevron-down" size={18} color={colors.gray400} />
          </Pressable>
          {areas.length > 0 ? (
            <View style={styles.chipWrap}>
              {areas.map((a) => (
                <Pressable key={a} style={styles.chip} onPress={() => toggleArea(a)}>
                  <Text style={styles.chipText}>{a}</Text>
                  <Feather name="x" size={12} color={colors.blue600} />
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.sectionGap}>
            <SectionLabel text="Property types you handle" />
          </View>
          <View style={styles.pillWrap}>
            {SPECIALISATIONS.map((t) => (
              <Pill
                key={t.value}
                label={t.label}
                selected={types.includes(t.value)}
                variant="soft"
                showCheck
                onPress={() => toggleType(t.value)}
              />
            ))}
          </View>
        </ScrollView>

        {/* Areas multi-select drawer */}
        <Modal visible={areaDrawerOpen} transparent animationType="slide" onRequestClose={() => setAreaDrawerOpen(false)}>
          <View style={styles.drawerWrap}>
            <Pressable style={styles.drawerBackdrop} onPress={() => setAreaDrawerOpen(false)} />
            <View style={styles.drawerSheet}>
              <View style={styles.drawerHandle} />
              <View style={styles.drawerHead}>
                <Text style={styles.drawerTitle}>Areas you cover</Text>
                <Pressable onPress={() => setAreaDrawerOpen(false)}>
                  <Feather name="x" size={22} color={colors.gray500} />
                </Pressable>
              </View>
              <TextInput
                style={styles.search}
                placeholder="Search states or areas..."
                placeholderTextColor={colors.gray400}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
              />
              <FlatList
                data={filteredAreas}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                style={styles.drawerList}
                renderItem={({ item }) => {
                  const selected = areas.includes(item);
                  return (
                    <Pressable style={styles.areaItem} onPress={() => toggleArea(item)}>
                      <Text style={styles.areaItemText}>{item}</Text>
                      {selected ? <Feather name="check" size={16} color={colors.blue600} /> : null}
                    </Pressable>
                  );
                }}
              />
              <Pressable style={styles.drawerDone} onPress={() => setAreaDrawerOpen(false)}>
                <Text style={styles.drawerDoneText}>
                  {areas.length ? `Done · ${areas.length} selected` : 'Done'}
                </Text>
              </Pressable>
            </View>
          </View>
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
  saveText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.blue600 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  sectionGap: { marginTop: 24 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  selectorText: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray900 },
  selectorPlaceholder: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray400 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.blue50,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.blue600 },
  drawerWrap: { flex: 1, justifyContent: 'flex-end' },
  drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  drawerSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    maxHeight: '80%',
  },
  drawerHandle: { width: 40, height: 4, borderRadius: 9999, backgroundColor: colors.gray200, alignSelf: 'center', marginBottom: 12 },
  drawerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  drawerTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.gray900, letterSpacing: -0.2 },
  search: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.gray900,
  },
  drawerList: { marginTop: 12 },
  areaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  areaItemText: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray900 },
  drawerDone: { marginTop: 12, backgroundColor: colors.blue600, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  drawerDoneText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
});
