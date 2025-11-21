import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAppSelector } from '@/store/hooks';

export default function TabIndex() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const role = user?.role || 'homeowner';

  // Redirect contractors to contractor dashboard
  useEffect(() => {
    if (role === 'contractor') {
      router.replace('/(tabs)/contractor-dashboard' as any);
    } else if (role === 'homeowner') {
      router.replace('/(tabs)/homeowner-dashboard' as any);
    }
  }, [role, router]);

  return null;
}
