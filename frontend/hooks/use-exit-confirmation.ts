import { useEffect } from 'react';
import { BackHandler, Alert, Platform } from 'react-native';
import { useRouter, useSegments } from 'expo-router';

/**
 * Hook to handle Android back button press with exit confirmation
 * Shows a confirmation dialog when on tab screens (instead of navigating back)
 */
export function useExitConfirmation() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Only handle on Android
    if (Platform.OS !== 'android') {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Check if we're on a tab screen
      const isOnTabScreen = segments[0] === '(tabs)';
      
      // If we're on a tab screen, always show exit confirmation
      // (don't navigate back, just show exit prompt)
      if (isOnTabScreen) {
        Alert.alert(
          'Exit App',
          'Do you want to exit the app?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {},
            },
            {
              text: 'Exit',
              style: 'destructive',
              onPress: () => {
                BackHandler.exitApp();
              },
            },
          ],
          { cancelable: true }
        );
        // Return true to prevent default back behavior
        return true;
      }


      router.back();
      
      // Return true to prevent default back behavior
      return true;
    });

    return () => backHandler.remove();
  }, [router, segments]);
}

