import React, { useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  useColorScheme,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { Colors } from '@/constants/theme';

interface IModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.75;

export function Modal({ visible, onClose, children }: IModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(MODAL_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      // Reset animation values
      overlayOpacity.setValue(0);
      translateY.setValue(MODAL_HEIGHT);
      
      // start both overlay + sheet together → smoother
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // slide down first
      Animated.timing(translateY, {
        toValue: MODAL_HEIGHT,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        // fade out after sliding
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start();
      });
    }
  }, [visible, overlayOpacity, translateY]);

  return (
    <RNModal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>

        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.background,
              maxHeight: MODAL_HEIGHT,
              transform: [{ translateY }],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 20,
    minHeight: MODAL_HEIGHT,
    overflow: 'hidden',
  },
});
