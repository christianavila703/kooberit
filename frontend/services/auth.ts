import { TOKEN_KEY } from '@/constants/config';
import endpoints from '@/constants/endpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../libs/api';
import { setAuthToken } from '@/libs/authToken';
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
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      setAuthToken(token);
      return token;
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
      setAuthToken(token);
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
      setAuthToken(null);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  /**
   * Login user
   */
  async login(credentials: ILoginRequest): Promise<IAuthResponse> {
    try {
      const response = await api.post<IApiResponse<IAuthResponse>>(
        endpoints.auth.login,
        credentials
      );

      // Backend returns { success: true, message: string, data: IAuthResponse }
      if (response.data.data?.token) {
        await this.saveToken(response.data.data.token);
      }

      return response.data.data!;
    } catch (error: any) {
      // Preserve the error message for email verification required
      if (error.response?.data?.message === 'EMAIL_VERIFICATION_REQUIRED') {
        const customError = new Error('EMAIL_VERIFICATION_REQUIRED');
        (customError as any).response = error.response;
        throw customError;
      }
      throw error;
    }
  }

  /**
   * Register user (returns email for OTP verification)
   */
  async register(userData: IRegisterRequest): Promise<{ message: string; email: string }> {
    const response = await api.post<IApiResponse<{ message: string; email: string }>>(
      endpoints.auth.register,
      userData
    );

    return response.data.data!;
  }

  /**
   * Verify email with OTP
   */
  async verifyEmailOTP(email: string, otpCode: string, inviteCode?: string): Promise<IAuthResponse> {
    const response = await api.post<IApiResponse<IAuthResponse>>(
      endpoints.auth.verifyEmailOTP,
      { email, otpCode, inviteCode }
    );

    if (response.data.data?.token) {
      await this.saveToken(response.data.data.token);
    }

    return response.data.data!;
  }

  /**
   * Resend verification OTP
   */
  async resendVerificationOTP(email: string): Promise<{ message: string }> {
    const response = await api.post<IApiResponse<{ message: string }>>(
      endpoints.auth.resendVerificationOTP,
      { email }
    );

    return response.data.data!;
  }

  /**
   * Reset password with OTP
   */
  async resetPasswordWithOTP(email: string, otpCode: string, newPassword: string): Promise<void> {
    const response = await api.post<IApiResponse<void>>(
      endpoints.auth.resetPassword,
      { email, otpCode, newPassword }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to reset password');
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await this.removeToken();
  }

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const response = await api.post<IApiResponse<void>>(
      endpoints.auth.changePassword,
      { oldPassword, newPassword }
    );
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to change password');
    }
  }
}

export default new AuthService();

