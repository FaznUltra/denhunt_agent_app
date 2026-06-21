import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export interface PickerModalProps {
  visible: boolean;
  title: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
}

// Full-screen searchable single-select list (state / LGA pickers).
export function PickerModal({ visible, title, options, selected, onSelect, onClose }: PickerModalProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q === '' ? options : options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  function handleClose() {
    setQuery('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={handleClose}>
            <Feather name="x" size={22} color={colors.gray500} />
          </Pressable>
        </View>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.search}
            placeholder="Search..."
            placeholderTextColor={colors.gray400}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = item === selected;
            return (
              <Pressable
                style={styles.row}
                onPress={() => {
                  onSelect(item);
                  handleClose();
                }}>
                <Text style={isSelected ? styles.rowTextSelected : styles.rowText}>{item}</Text>
                {isSelected ? <Feather name="check" size={18} color={colors.blue600} /> : null}
              </Pressable>
            );
          }}
        />
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
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.gray900 },
  searchWrap: { paddingHorizontal: 20, paddingVertical: 12 },
  search: {
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.gray900,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  rowText: { fontFamily: fonts.regular, fontSize: 15, color: colors.gray900 },
  rowTextSelected: { fontFamily: fonts.semibold, fontSize: 15, color: colors.blue600 },
});
