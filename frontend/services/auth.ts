import { TOKEN_KEY } from '@/constants/config';
import endpoints from '@/constants/endpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../libs/api';
import type {
  IApiResponse,
  ILoginRequest,
  IRegisterRequest,
  IAuthResponse,
} from '@/types';

/**
 * Auth Service
 */
class AuthService {

  /**
   * Get authorization token from storage
   */
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Save authorization token to storage
   */
  async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  /**
   * Remove authorization token from storage
   */
  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  /**
   * Login user
   */
  async login(credentials: ILoginRequest): Promise<IAuthResponse> {
    const response = await api.post<IApiResponse<IAuthResponse>>(
      endpoints.auth.login,
      credentials
    );

    // Backend returns { success: true, message: string, data: IAuthResponse }
    if (response.data.data?.token) {
      await this.saveToken(response.data.data.token);
    }

    return response.data.data!;
  }

  /**
   * Register user
   */
  async register(userData: IRegisterRequest): Promise<IAuthResponse> {
    const response = await api.post<IApiResponse<IAuthResponse>>(
      endpoints.auth.register,
      userData
    );

    // Backend returns { success: true, message: string, data: IAuthResponse }
    if (response.data.data?.token) {
      await this.saveToken(response.data.data.token);
    }

    return response.data.data!;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await this.removeToken();
  }
}

export default new AuthService();

