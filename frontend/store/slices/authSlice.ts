import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiService from '@/services/auth';
import type {
  ILoginRequest,
  IRegisterRequest,
  IUser,
  IAuthState,
  IMode,
} from '@/types';

const initialState: IAuthState = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  mode: 'homeowner',
};

/**
 * Login async thunk
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: ILoginRequest, { rejectWithValue }) => {
    try {
      const response = await apiService.login(credentials);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

/**
 * Register async thunk
 */
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: IRegisterRequest, { rejectWithValue }) => {
    try {
      const response = await apiService.register(userData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

/**
 * Logout async thunk
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await apiService.logout();
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

/**
 * Verify email with OTP
 */
export const verifyEmailOTP = createAsyncThunk(
  'auth/verifyEmailOTP',
  async ({ email, otpCode, inviteCode }: { email: string; otpCode: string; inviteCode?: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.verifyEmailOTP(email, otpCode, inviteCode);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Email verification failed');
    }
  }
);

/**
 * Resend verification OTP
 */
export const resendVerificationOTP = createAsyncThunk(
  'auth/resendVerificationOTP',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await apiService.resendVerificationOTP(email);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to resend verification code');
    }
  }
);

/**
 * Initialize auth state from storage
 */
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const token = await apiService.getToken();
      if (token) {
        // You can add a token verification endpoint here
        return { token, user: null }; // User will be fetched if needed
      }
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Initialization failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<IUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      // Set default mode based on user role
      if (action.payload.role === 'contractor') {
        state.mode = 'contractor';
      } else {
        state.mode = 'homeowner';
      }
    },
    setCredentials: (state, action: PayloadAction<{ user: IUser; token: string }>) => {
      console.log('setCredentials', action.payload);
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
      // Set default mode based on user role
      if (action.payload.user.role === 'contractor') {
        state.mode = 'contractor';
      } else {
        state.mode = 'homeowner';
      }
    },
    toggleMode: (state) => {
      if (state.user?.role === 'contractor') {
        state.mode = state.mode === 'contractor' ? 'homeowner' : 'contractor';
      }
    },
    setMode: (state, action: PayloadAction<IMode>) => {
      if (state.user?.role === 'contractor') {
        state.mode = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        // Set default mode based on user role
        if (action.payload.user.role === 'contractor') {
          state.mode = 'contractor';
        } else {
          state.mode = 'homeowner';
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Register (now returns email for OTP verification)
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false;
        // Don't set user/token here - wait for OTP verification
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
        state.mode = 'homeowner';
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Verify Email OTP
    builder
      .addCase(verifyEmailOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyEmailOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        // Set default mode based on user role
        if (action.payload.user.role === 'contractor') {
          state.mode = 'contractor';
        } else {
          state.mode = 'homeowner';
        }
      })
      .addCase(verifyEmailOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Resend Verification OTP
    builder
      .addCase(resendVerificationOTP.pending, (state) => {
        // Don't set loading to true for resend to avoid blocking UI
      })
      .addCase(resendVerificationOTP.rejected, (state, action) => {
        // Only set error if resend fails
        state.error = action.payload as string;
      });

    // Initialize
    builder
      .addCase(initializeAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.token = action.payload.token;
          // If user is provided, set it
          if (action.payload.user) {
            state.user = action.payload.user;
            state.isAuthenticated = true;
          }
        }
      });
  },
});

export const { clearError, setUser, setCredentials, toggleMode, setMode } = authSlice.actions;
export default authSlice.reducer;

