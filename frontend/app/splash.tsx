import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '@/store/hooks';
import { useAppDispatch } from '@/store/hooks';
import { initializeAuth } from '@/store/slices/authSlice';
import { IRootState } from '@/store';
import { images } from '@/constants/resources';

const { width, height } = Dimensions.get('window');

const splashImage = images.splash;

export default function SplashScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, token } = useAppSelector((state: IRootState) => state.auth);
  const insets = useSafeAreaInsets();
  
  const progress = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current; // Start at 1 since native splash already shows image
  const loadingTextOpacity = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const dot1Opacity = useRef(new Animated.Value(0)).current;
  const dot2Opacity = useRef(new Animated.Value(0)).current;
  const dot3Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initialize auth state
    dispatch(initializeAuth());

    // Start animations
    Animated.parallel([
      // Show loading text
      Animated.timing(loadingTextOpacity, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      // Progress bar animation
      Animated.timing(progress, {
        toValue: 100,
        duration: 2500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      // Animated dots
      Animated.sequence([
        Animated.timing(dot1Opacity, {
          toValue: 1,
          duration: 300,
          delay: 600,
          useNativeDriver: true,
        }),
        Animated.timing(dot2Opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(dot3Opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Shimmer animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [dispatch, fadeAnim, loadingTextOpacity, progress, shimmerAnim, dot1Opacity, dot2Opacity, dot3Opacity]);

  useEffect(() => {
    // Wait for animations to complete, then navigate
    const timer = setTimeout(() => {
    if (isAuthenticated) {
        router.replace('/(tabs)');
    } else {
        router.replace('/(auth)');
    }
    }, 2800); // Slightly longer than animation duration

    return () => clearTimeout(timer);
  }, [token, isAuthenticated, router]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 2, width * 2],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Splash Image - extends behind status bar */}
        <Image
          source={splashImage}
          style={[
            styles.splashImage,
            {
              top: -insets.top,
              height: height + insets.top + insets.bottom + 50,
            },
          ]}
          contentFit="cover"
          transition={200}
        />

        {/* Title Section */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: fadeAnim,
              paddingTop: insets.top + 120,
              paddingRight: 32,
            },
          ]}
        >
          <Text style={styles.mainTitle}>BuildConnect</Text>
          <Text style={styles.tagline}>Find Work. Find Contractors.</Text>
        </Animated.View>

        {/* Loading Section */}
        <View style={[styles.loadingContainer, { bottom: Math.max(insets.bottom, 60) }]}>
          {/* Progress Bar Container */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressWidth,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.shimmer,
                    {
                      transform: [{ translateX: shimmerTranslateX }],
                    },
                  ]}
                />
              </Animated.View>
            </View>
          </View>

          {/* Loading Text */}
          <Animated.View
            style={[
              styles.loadingTextContainer,
              {
                opacity: loadingTextOpacity,
              },
            ]}
          >
            <Text style={styles.loadingText}>Loading</Text>
            <View style={styles.dotsContainer}>
              <Animated.Text
                style={[
                  styles.dot,
                  {
                    opacity: dot1Opacity,
                  },
                ]}
              >
                .
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.dot,
                  {
                    opacity: dot2Opacity,
                  },
                ]}
              >
                .
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.dot,
                  {
                    opacity: dot3Opacity,
                  },
                ]}
              >
                .
              </Animated.Text>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0', // Beige background matching the image
    width: width,
    height: height,
  },
  content: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  splashImage: {
    width: width,
    height: height + 200, // Extra height to cover status bar and safe areas
    position: 'absolute',
    left: 0,
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    paddingLeft: 32,
    zIndex: 10,
  },
  mainTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'right',
    letterSpacing: -1,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tagline: {
    fontSize: 17,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'left',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
    width: '100%',
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0a7ea4', // Matching the app's tint color
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    width: 50,
  },
  loadingTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    letterSpacing: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginLeft: 4,
  },
  dot: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 2,
  },
});

