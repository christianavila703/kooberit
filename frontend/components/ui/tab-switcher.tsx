import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from './icon-symbol';

interface TabSwitcherProps {
  value: 'contractor' | 'homeowner';
  onValueChange: (value: 'contractor' | 'homeowner') => void;
  colors: {
    background: string;
    text: string;
    tint: string;
    icon: string;
  };
  isDark: boolean;
}

export function TabSwitcher({ value, onValueChange, colors, isDark }: TabSwitcherProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.tab,
          value === 'contractor' && {
            backgroundColor: colors.tint,
          },
          value !== 'contractor' && {
            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
          },
        ]}
        onPress={() => onValueChange('contractor')}
        activeOpacity={0.7}>
        <IconSymbol
          name="person.2.fill"
          size={18}
          color={value === 'contractor' ? '#fff' : colors.icon}
        />
        <Text
          style={[
            styles.tabText,
            {
              color: value === 'contractor' ? '#fff' : colors.text,
            },
          ]}>
          Contractor
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          value === 'homeowner' && {
            backgroundColor: colors.tint,
          },
          value !== 'homeowner' && {
            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
          },
        ]}
        onPress={() => onValueChange('homeowner')}
        activeOpacity={0.7}>
        <IconSymbol
          name="person.fill"
          size={18}
          color={value === 'homeowner' ? '#fff' : colors.icon}
        />
        <Text
          style={[
            styles.tabText,
            {
              color: value === 'homeowner' ? '#fff' : colors.text,
            },
          ]}>
          Homeowner
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    gap: 2,
    overflow: 'hidden',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 90,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

