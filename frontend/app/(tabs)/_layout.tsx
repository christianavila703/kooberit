import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppSelector } from '@/store/hooks';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAppSelector((state) => state.auth);
  const role = user?.role || 'homeowner';

  // Role-based tab configuration
  const isHomeowner = role === 'homeowner';
  const isContractor = role === 'contractor';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
      initialRouteName={isHomeowner ? 'index' : (isContractor ? 'contractor-dashboard' : 'index')}>
      {/* Homeowner Dashboard - only show for homeowners */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          href: isHomeowner ? undefined : null,
        }}
      />
      
      {/* Contractor Dashboard - only show for contractors */}
      <Tabs.Screen
        name="contractor-dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          href: isContractor ? undefined : null,
        }}
      />
      
      {/* Messages - show for both roles */}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="message.fill" color={color} />,
        }}
      />
      
      {/* Profile - show for both roles */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
