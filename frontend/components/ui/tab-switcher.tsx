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
  contractorUnreadCount?: number;
  homeownerUnreadCount?: number;
}

export const TabSwitcher = React.memo(function TabSwitcher({ 
  value, 
  onValueChange, 
  colors, 
  isDark,
  contractorUnreadCount = 0,
  homeownerUnreadCount = 0,
}: TabSwitcherProps) {
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
        <View style={styles.iconContainer}>
          <IconSymbol
            name="person.2.fill"
            size={18}
            color={value === 'contractor' ? '#fff' : colors.icon}
          />
          {contractorUnreadCount > 0 && (
            <View style={styles.notificationDot} />
          )}
        </View>
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
        <View style={styles.iconContainer}>
          <IconSymbol
            name="person.fill"
            size={18}
            color={value === 'homeowner' ? '#fff' : colors.icon}
          />
          {homeownerUnreadCount > 0 && (
            <View style={styles.notificationDot} />
          )}
        </View>
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
});

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
  iconContainer: {
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: '#FF3B30',
  },
});

