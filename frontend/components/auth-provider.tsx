import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { initializeAuth } from '@/store/slices/authSlice';

/**
 * Auth Provider Component
 * Handles authentication state initialization and navigation
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, token } = useAppSelector((state) => state.auth);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Initialize auth state from storage
    dispatch(initializeAuth());
  }, [dispatch]);

  useEffect(() => {

    const firstSegment = segments[0] as string;
    const inAuthGroup = firstSegment === '(auth)' || firstSegment === 'sign-in' || firstSegment === 'sign-up';
    const isSplash = firstSegment === 'splash' || firstSegment === undefined;

    if (token === null && !inAuthGroup) {
      router.replace('/sign-in' as any);
      return;
    }

    if (token === null) return;

    // Don't redirect if on splash screen - let splash handle navigation
    if (isSplash) return;

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to sign-in if not authenticated
      router.replace('/sign-in' as any);
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to tabs if authenticated
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, token]);

  return <>{children}</>;
}

