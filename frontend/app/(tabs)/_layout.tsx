import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { AnimatedTabIcon } from '@/components/animated-tab-icon';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useExitConfirmation } from '@/hooks/use-exit-confirmation';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // Handle exit confirmation on back button press
  useExitConfirmation();

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
      initialRouteName="dashboard">

      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon size={28} name="house.fill" color={color} focused={focused} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon size={28} name="message.fill" color={color} focused={focused} />
          ),
        }}
      />
      
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
          href: null,
        }}
      />
    </Tabs>
  );
}
