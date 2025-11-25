import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPlatformPressable = Animated.createAnimatedComponent(PlatformPressable);

export function HapticTab(props: BottomTabBarButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = (ev: any) => {
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Visual feedback - scale down and slightly reduce opacity
    scale.value = withSpring(0.85, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(0.7, { duration: 100 });

    props.onPressIn?.(ev);
  };

  const handlePressOut = (ev: any) => {
    // Scale back up with spring animation
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(1, { duration: 150 });

    props.onPressOut?.(ev);
  };

  return (
    <AnimatedPlatformPressable
      {...props}
      style={[props.style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    />
  );
}
