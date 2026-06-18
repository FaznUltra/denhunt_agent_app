import { useMemo, useState } from 'react';
import {
  Modal,
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
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import ProgressBar from '@/components/ui/ProgressBar';
import { SectionLabel } from '@/components/ui';
import { useOnboardingStore } from '@/stores/onboardingStore';

const EXPERIENCE_OPTIONS = ['Less than 1 yr', '1–3 yrs', '3–5 yrs', '5–10 yrs', '10+ yrs'];

const PROPERTY_TYPES: { label: string; value: string }[] = [
  { label: 'Apartments', value: 'apartment' },
  { label: 'Self-contained', value: 'self_con' },
  { label: 'Mini flats', value: 'mini_flat' },
  { label: 'Duplexes', value: 'duplex' },
  { label: 'Bungalows', value: 'bungalow' },
  { label: 'Commercial', value: 'commercial' },
  { label: 'Land', value: 'land' },
  { label: 'Short-lets', value: 'shortlet' },
];

const AREAS = [
  'Lagos', 'Abuja (FCT)', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu', 'Benin City',
  'Kaduna', 'Jos', 'Abeokuta', 'Ilorin', 'Owerri', 'Calabar', 'Uyo', 'Warri',
  'Asaba', 'Akure', 'Ado-Ekiti', 'Maiduguri', 'Sokoto',
];

const CAC_REGEX = /^RC\d{6,7}$/i;

// Step 5 of onboarding — professional details. Agency fields show for
// agency_admin only. See PRD Section 3.2 (Step 4) and 3.3 (Step 4).
export default function ProfessionalScreen() {
  const insets = useSafeAreaInsets();
  const role = useOnboardingStore((s) => s.role);
  const setAreasStore = useOnboardingStore((s) => s.setAreas);
  const setPropertyTypesStore = useOnboardingStore((s) => s.setPropertyTypes);
  const setYearsExperience = useOnboardingStore((s) => s.setYearsExperience);
  const setAgencyName = useOnboardingStore((s) => s.setAgencyName);
  const setCacNumber = useOnboardingStore((s) => s.setCacNumber);

  const isAgency = role === 'agency_admin';

  const [years, setYears] = useState<string | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [areaDrawerOpen, setAreaDrawerOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [agencyNameLocal, setAgencyNameLocal] = useState('');
  const [cacLocal, setCacLocal] = useState('');

  // Drawer list shows every area matching the search; selected ones show a tick.
  const filteredAreas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q === '' ? AREAS : AREAS.filter((a) => a.toLowerCase().includes(q));
  }, [query]);

  function toggleType(value: string) {
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function toggleArea(area: string) {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  }

  function removeArea(area: string) {
    setSelectedAreas((prev) => prev.filter((a) => a !== area));
  }

  function closeAreaDrawer() {
    setAreaDrawerOpen(false);
    setQuery('');
  }

  const baseValid = years !== null && selectedAreas.length > 0 && selectedTypes.length > 0;
  const agencyValid = agencyNameLocal.trim().length > 0 && CAC_REGEX.test(cacLocal.trim());
  const canContinue = isAgency ? baseValid && agencyValid : baseValid;

  function handleContinue() {
    if (!canContinue || !years) return;
    setAreasStore(selectedAreas);
    setPropertyTypesStore(selectedTypes);
    setYearsExperience(years);
    if (isAgency) {
      setAgencyName(agencyNameLocal.trim());
      setCacNumber(cacLocal.trim().toUpperCase());
    }
    router.push('/(auth)/identity' as Href);
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
            <ProgressBar currentStep={5} totalSteps={6} />
          </View>
        </View>

        {/* Intro */}
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>Step 5 of 6</Text>
          <Text style={styles.headline}>Your professional details</Text>
          <Text style={styles.subtext}>Help clients understand your expertise.</Text>
        </View>

        {/* Years of experience */}
        <Text style={styles.label}>Years of experience</Text>
        <View style={styles.pillWrap}>
          {EXPERIENCE_OPTIONS.map((opt) => {
            const selected = years === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setYears(opt)}
                style={[styles.pill, selected && styles.pillSelected]}>
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Areas of operation */}
        <Text style={[styles.label, styles.sectionGap]}>Areas you cover</Text>
        <Text style={styles.hint}>Select all that apply</Text>

        <Pressable
          accessibilityRole="button"
          style={styles.selectorField}
          onPress={() => setAreaDrawerOpen(true)}>
          <Text style={selectedAreas.length > 0 ? styles.selectorText : styles.selectorPlaceholder}>
            {selectedAreas.length > 0
              ? `${selectedAreas.length} area${selectedAreas.length > 1 ? 's' : ''} selected`
              : 'Select states or areas'}
          </Text>
          <Feather name="chevron-down" size={18} color={colors.gray400} />
        </Pressable>

        {selectedAreas.length > 0 && (
          <View style={styles.chipWrap}>
            {selectedAreas.map((area) => (
              <Pressable key={area} style={styles.chip} onPress={() => removeArea(area)}>
                <Text style={styles.chipText}>{area}</Text>
                <Feather name="x" size={12} color={colors.blue600} />
              </Pressable>
            ))}
          </View>
        )}

        {/* Property types */}
        <Text style={[styles.label, styles.sectionGap]}>Property types you handle</Text>
        <View style={styles.pillWrap}>
          {PROPERTY_TYPES.map((t) => {
            const selected = selectedTypes.includes(t.value);
            return (
              <Pressable
                key={t.value}
                onPress={() => toggleType(t.value)}
                style={[styles.pill, selected && styles.pillSelected]}>
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Agency details (agency_admin only) */}
        {isAgency && (
          <View style={styles.agencySection}>
            <SectionLabel text="Agency details" />
            <View style={styles.field}>
              <Text style={styles.label}>Agency name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Okafor Properties Ltd"
                placeholderTextColor={colors.gray400}
                value={agencyNameLocal}
                onChangeText={setAgencyNameLocal}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>CAC registration number</Text>
              <TextInput
                style={styles.input}
                placeholder="RC123456"
                placeholderTextColor={colors.gray400}
                value={cacLocal}
                onChangeText={setCacLocal}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Text style={styles.cacHint}>Format: RC followed by 6–7 digits</Text>
            </View>
          </View>
        )}
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

      {/* Areas bottom drawer */}
      <Modal
        visible={areaDrawerOpen}
        transparent
        animationType="slide"
        onRequestClose={closeAreaDrawer}>
        <View style={styles.drawerBackdropWrap}>
          <Pressable style={styles.drawerBackdrop} onPress={closeAreaDrawer} />
          <View style={[styles.drawerSheet, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Areas you cover</Text>
              <Pressable accessibilityRole="button" onPress={closeAreaDrawer}>
                <Feather name="x" size={22} color={colors.gray500} />
              </Pressable>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search states or areas..."
              placeholderTextColor={colors.gray400}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoFocus
            />

            <ScrollView style={styles.drawerList} keyboardShouldPersistTaps="handled">
              {filteredAreas.map((area) => {
                const selected = selectedAreas.includes(area);
                return (
                  <Pressable key={area} style={styles.areaItem} onPress={() => toggleArea(area)}>
                    <Text style={styles.areaItemText}>{area}</Text>
                    {selected && <Feather name="check" size={16} color={colors.blue600} />}
                  </Pressable>
                );
              })}
              {filteredAreas.length === 0 && (
                <Text style={styles.drawerEmpty}>No areas match “{query}”.</Text>
              )}
            </ScrollView>

            <Pressable style={styles.drawerDone} onPress={closeAreaDrawer}>
              <Text style={styles.drawerDoneText}>
                {selectedAreas.length > 0 ? `Done · ${selectedAreas.length} selected` : 'Done'}
              </Text>
            </Pressable>
          </View>
        </View>
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
  sectionGap: { marginTop: 24 },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400, marginTop: 3 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pillSelected: { backgroundColor: colors.blue50, borderWidth: 1.5, borderColor: colors.blue600 },
  pillText: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray700 },
  pillTextSelected: { fontFamily: fonts.semibold, color: colors.blue600 },
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
  searchInput: {
    marginTop: 10,
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
  selectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    marginTop: 10,
  },
  selectorText: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray900 },
  selectorPlaceholder: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray400 },
  areaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  areaItemText: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray900 },
  drawerBackdropWrap: { flex: 1, justifyContent: 'flex-end' },
  drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  drawerSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '80%',
  },
  drawerHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 9999,
    backgroundColor: colors.gray200,
    marginBottom: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.gray900, letterSpacing: -0.2 },
  drawerList: { marginTop: 12 },
  drawerEmpty: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, paddingVertical: 16 },
  drawerDone: {
    marginTop: 12,
    backgroundColor: colors.blue600,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  drawerDoneText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  agencySection: { marginTop: 8 },
  field: { marginTop: 16 },
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
  cacHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginTop: 5 },
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
});
