import React from 'react';
import { Redirect } from 'expo-router';
import { useAppSelector } from '@/store/hooks';

export default function TabIndex() {
  const { user } = useAppSelector((state) => state.auth);
  const role = user?.role || 'homeowner';

  // Immediately redirect to the appropriate dashboard
  if (role === 'contractor') {
    return <Redirect href="/(tabs)/contractor-dashboard" />;
  }
  
  return <Redirect href="/(tabs)/homeowner-dashboard" />;
}
