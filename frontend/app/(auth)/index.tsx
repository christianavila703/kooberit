import { Redirect } from 'expo-router';
import { useAppSelector } from '@/store/hooks';

export default function AuthIndex() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // If authenticated, redirect to tabs
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  // Otherwise, redirect to sign-in
  return <Redirect href="/sign-in" />;
}

