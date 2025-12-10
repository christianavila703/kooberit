import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Modal } from '@/components/ui/modal';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type Province = 'ON' | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'PE' | 'QC' | 'SK' | 'NT' | 'NU' | 'YT';

interface ProvinceSelectProps {
  value: Province;
  onValueChange: (value: Province) => void;
  disabled?: boolean;
  error?: boolean;
}

const PROVINCES: { value: Province; label: string }[] = [
  { value: 'ON', label: 'Ontario (ON)' },
  { value: 'AB', label: 'Alberta (AB)' },
  { value: 'BC', label: 'British Columbia (BC)' },
  { value: 'MB', label: 'Manitoba (MB)' },
  { value: 'NB', label: 'New Brunswick (NB)' },
  { value: 'NL', label: 'Newfoundland and Labrador (NL)' },
  { value: 'NS', label: 'Nova Scotia (NS)' },
  { value: 'PE', label: 'Prince Edward Island (PE)' },
  { value: 'QC', label: 'Quebec (QC)' },
  { value: 'SK', label: 'Saskatchewan (SK)' },
  { value: 'NT', label: 'Northwest Territories (NT)' },
  { value: 'NU', label: 'Nunavut (NU)' },
  { value: 'YT', label: 'Yukon (YT)' },
];

export default function ProvinceSelect({
  value,
  onValueChange,
  disabled = false,
  error = false,
}: ProvinceSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const selectedProvince = PROVINCES.find((p) => p.value === value);

  const handleSelect = (province: Province) => {
    onValueChange(province);
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.selectButton,
          {
            backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
            borderColor: error ? '#FF3B30' : 'transparent',
          },
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}>
        <Text
          style={[
            styles.selectText,
            {
              color: selectedProvince ? colors.text : colors.icon,
            },
          ]}>
          {selectedProvince ? selectedProvince.label : 'Select Province'}
        </Text>
        <IconSymbol
          name="chevron.down"
          size={20}
          color={colors.icon}
          style={styles.chevron}
        />
      </TouchableOpacity>

      <Modal visible={isOpen} onClose={() => setIsOpen(false)}>
        <View style={styles.modalContent}>
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#2E2E2E' : '#E0E0E0' }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Province
            </Text>
            <TouchableOpacity onPress={() => setIsOpen(false)}>
              <IconSymbol name="xmark" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={PROVINCES}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  {
                    backgroundColor:
                      value === item.value
                        ? colors.tint + '20'
                        : 'transparent',
                  },
                ]}
                onPress={() => handleSelect(item.value)}>
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: value === item.value ? colors.tint : colors.text,
                      fontWeight: value === item.value ? '600' : '400',
                    },
                  ]}>
                  {item.label}
                </Text>
                {value === item.value && (
                  <IconSymbol name="checkmark" size={20} color={colors.tint} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectButton: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    marginTop: 8,
  },
  selectText: {
    fontSize: 16,
    flex: 1,
  },
  chevron: {
    marginLeft: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
});

