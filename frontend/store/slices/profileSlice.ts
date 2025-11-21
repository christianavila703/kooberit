import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import profileService, { IProfileSettings, IProfileAddress } from '@/services/profile';
import { logoutUser } from './authSlice';

interface IProfileState {
  settings: IProfileSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: IProfileState = {
  settings: {
    contractorAddress: null,
    notificationEnabled: true,
    notificationRadius: 50,
  },
  isLoading: false,
  isSaving: false,
  error: null,
  lastFetched: null,
};

/**
 * Fetch profile settings from API
 */
export const fetchProfileSettings = createAsyncThunk(
  'profile/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const settings = await profileService.getSettings();
      return settings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load settings');
    }
  }
);

/**
 * Update profile settings via API
 */
export const updateProfileSettings = createAsyncThunk(
  'profile/updateSettings',
  async (settings: Partial<IProfileSettings>, { rejectWithValue }) => {
    try {
      const updatedSettings = await profileService.updateSettings(settings);
      return updatedSettings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update settings');
    }
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Optimistic update for notification toggle (for immediate UI feedback)
    setNotificationEnabled: (state, action: PayloadAction<boolean>) => {
      state.settings.notificationEnabled = action.payload;
    },
    // Reset to initial state (e.g., on logout)
    resetSettings: (state) => {
      state.settings = initialState.settings;
      state.error = null;
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch settings
    builder
      .addCase(fetchProfileSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProfileSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        // Merge with existing settings to preserve structure
        state.settings = {
          ...state.settings,
          ...action.payload,
        };
        state.error = null;
        state.lastFetched = Date.now();
      })
      .addCase(fetchProfileSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update settings
    builder
      .addCase(updateProfileSettings.pending, (state, action) => {
        state.isSaving = true;
        state.error = null;
        // Optimistic update - apply changes immediately for better UX
        if (action.meta.arg.notificationEnabled !== undefined) {
          state.settings.notificationEnabled = action.meta.arg.notificationEnabled;
        }
        if (action.meta.arg.notificationRadius !== undefined) {
          state.settings.notificationRadius = action.meta.arg.notificationRadius;
        }
        if (action.meta.arg.contractorAddress !== undefined) {
          state.settings.contractorAddress = action.meta.arg.contractorAddress;
        }
      })
      .addCase(updateProfileSettings.fulfilled, (state, action) => {
        state.isSaving = false;
        // Use the full response from API to ensure consistency
        state.settings = {
          ...state.settings,
          ...action.payload,
        };
        state.error = null;
        state.lastFetched = Date.now();
      })
      .addCase(updateProfileSettings.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
        // Revert optimistic update on error - refetch to get correct state
        // Note: We don't revert here to avoid flickering, but we should refetch
      });

    // Reset settings on logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.settings = initialState.settings;
      state.error = null;
      state.lastFetched = null;
      state.isLoading = false;
      state.isSaving = false;
    });
  },
});

export const { clearError, setNotificationEnabled, resetSettings } = profileSlice.actions;
export default profileSlice.reducer;

