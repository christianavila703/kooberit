import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY } from '@/constants/config';

let cachedToken: string | null | undefined = undefined;
let inFlight: Promise<string | null> | null = null;

/**
 * Returns the auth token with a one-time AsyncStorage read.
 * - `undefined` means "not initialized yet"
 * - `null` means "initialized and no token"
 */
export async function getAuthToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      cachedToken = token;
      return token;
    } catch (e) {
      // If storage fails, treat as unauthenticated but keep things working.
      cachedToken = null;
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function setAuthToken(token: string | null) {
  cachedToken = token;
}

export function clearAuthToken() {
  cachedToken = null;
}

