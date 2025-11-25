import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { AnimatedTabIcon } from '@/components/animated-tab-icon';
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
        // Tab bar styling for better visual feedback
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarHideOnKeyboard: true,
      }}
      initialRouteName={isHomeowner ? 'homeowner-dashboard' : 'contractor-dashboard'}>
      {/* Homeowner Dashboard - only show for homeowners */}
      <Tabs.Screen
        name="homeowner-dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon size={28} name="house.fill" color={color} focused={focused} />
          ),
          href: isHomeowner ? undefined : null,
        }}
      />
      
      {/* Contractor Dashboard - only show for contractors */}
      <Tabs.Screen
        name="contractor-dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon size={28} name="house.fill" color={color} focused={focused} />
          ),
          href: isContractor ? undefined : null,
        }}
      />
      
      {/* Messages - show for both roles */}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon size={28} name="message.fill" color={color} focused={focused} />
          ),
        }}
      />
      
      {/* Profile - show for both roles */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon size={28} name="person.fill" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: 'index',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon size={28} name="house.fill" color={color} focused={focused} />
          ),
          href: null,
        }}
      />
    </Tabs>
  );
}
