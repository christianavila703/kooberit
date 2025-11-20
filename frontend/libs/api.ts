import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG, TOKEN_KEY } from '@/constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IApiResponse } from '@/types';

/**
 * Create and configure axios instance
 */
const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get authorization token from storage
 */
const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

/**
 * Request interceptor to add auth token
 */
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log request for debugging
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      url: `${config.baseURL}${config.url}`,
      data: config.data,
    });
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<IApiResponse>) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.message || 'An error occurred';
      console.error('API Error Response:', {
        status: error.response.status,
        message,
        data: error.response.data,
      });
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // Request was made but no response received
      console.error('API Network Error:', {
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method,
        },
      });
      return Promise.reject(new Error('Network error occurred. Please check your connection.'));
    } else {
      // Something else happened
      console.error('API Unexpected Error:', error.message);
      return Promise.reject(new Error(error.message || 'An unexpected error occurred'));
    }
  }
);

export default api;

