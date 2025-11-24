import { Platform } from 'react-native';

/**
 * API Configuration
 * 
 * For development:
 * - iOS Simulator: Use 'http://localhost:5000/api'
 * - Android Emulator: Use 'http://10.0.2.2:5000/api'
 * - Physical Device: Use your computer's IP address, e.g., 'http://192.168.1.100:5000/api'
 * 
 * To find your IP address:
 * - Windows: ipconfig (look for IPv4 Address)
 * - Mac/Linux: ifconfig or ip addr
 */
export const API_CONFIG = {
    // Change this to your backend URL
    BASE_URL: __DEV__ 
      ? Platform.OS === 'android'
        ? 'http://10.0.2.2:5000/api' // Android Emulator
        : 'http://localhost:5000/api' // iOS Simulator / Web
      : 'https://server.kooberit.com/api', // Production
    TIMEOUT: 10000,
};
  
export const TOKEN_KEY = '@kooberit:token';

/**
 * Stripe Configuration
 * Get your publishable key from: https://dashboard.stripe.com/apikeys
 */
export const STRIPE_PUBLISHABLE_KEY = __DEV__
  ? process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST || ''
  : process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE || '';