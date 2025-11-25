import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';

interface AnimatedTabIconProps {
  name: IconSymbolName;
  size: number;
  color: string;
  focused: boolean;
}

/**
 * Animated tab icon that scales up when the tab is focused
 */
export function AnimatedTabIcon({ name, size, color, focused }: AnimatedTabIconProps) {
  const scale = useSharedValue(focused ? 1.1 : 1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, {
      damping: 15,
      stiffness: 300,
    });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <IconSymbol name={name} size={size} color={color} />
    </Animated.View>
  );
}

