import { useEffect, useState } from 'react';
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Initialize auth state from storage
    dispatch(initializeAuth());
  }, [dispatch]);

  // Wait for component to mount and router to be ready
  useEffect(() => {
    // Use a small delay to ensure the router is ready
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Don't navigate until component is mounted and router is ready
    if (!isMounted) return;

    try {
      const firstSegment = segments[0] as string;
      const inAuthGroup = firstSegment === '(auth)' || firstSegment === 'sign-in' || firstSegment === 'sign-up';
      const isSplash = firstSegment === 'splash' || firstSegment === undefined;

      // Don't redirect if on splash screen - let splash handle navigation
      if (isSplash) return;

      if (token === null && !inAuthGroup) {
        router.replace('/sign-in' as any);
        return;
      }

      if (token === null) return;

      if (!isAuthenticated && !inAuthGroup) {
        // Redirect to sign-in if not authenticated
        router.replace('/sign-in' as any);
      } else if (isAuthenticated && inAuthGroup) {
        // Redirect to tabs if authenticated
        router.replace('/(tabs)');
      }
    } catch (error) {
      // Silently handle navigation errors if router isn't ready yet
      console.warn('Navigation error:', error);
    }
  }, [isAuthenticated, segments, token, isMounted, router]);

  return <>{children}</>;
}

