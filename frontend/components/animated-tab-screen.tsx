import React, { useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedTabScreenProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that adds fade-in animation when a tab screen is focused
 */
export function AnimatedTabScreen({ children }: AnimatedTabScreenProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useFocusEffect(
    React.useCallback(() => {
      // Animate in when screen is focused
      opacity.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      });
      translateY.value = withTiming(0, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      });

      return () => {
        // Animate out when screen loses focus
        opacity.value = withTiming(0, {
          duration: 150,
          easing: Easing.in(Easing.ease),
        });
        translateY.value = withTiming(20, {
          duration: 150,
          easing: Easing.in(Easing.ease),
        });
      };
    }, [])
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

