import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import contractorService from '@/services/contractor';
import { fetchProfileSettings } from './profileSlice';
import { IJobPost } from '@/types';
import type { IRootState } from '@/store';

interface IContractorState {
  jobPosts: IJobPost[];
  radius: number | null; // null means "All"
  categories: string[];
  searchQuery: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } | null;
  error: string | null;
}

const initialState: IContractorState = {
  jobPosts: [],
  radius: null,
  categories: [],
  searchQuery: '',
  isLoading: false,
  isLoadingMore: false,
  isRefreshing: false,
  pagination: null,
  error: null,
};

/**
 * Fetch job posts with filters
 * First fetches profile to get default categories, then fetches job posts
 */
export const fetchJobPosts = createAsyncThunk(
  'contractor/fetchJobPosts',
  async (
    params: {
      reset?: boolean;
      page?: number;
      search?: string;
      radius?: number | null;
      categories?: string[];
    },
    { dispatch, getState, rejectWithValue }
  ) => {
    try {
      // First, ensure profile is fetched
      const state = getState() as IRootState;
      if (!state.profile.lastFetched) {
        await dispatch(fetchProfileSettings()).unwrap();
      }

      // Get updated state after profile fetch
      const updatedState = getState() as IRootState;
      const profileCategories = updatedState.profile.settings.constructionCategories || [];

      // Use provided categories, or fall back to profile categories, or undefined
      const categoriesToUse = params.categories !== undefined
        ? params.categories
        : (profileCategories.length > 0 ? profileCategories : undefined);

      // Fetch job posts
      const result = await contractorService.getJobBoard({
        radius: params.radius ?? undefined,
        categories: categoriesToUse,
        search: params.search || undefined,
        page: params.page || 1,
        limit: 20,
      });

      return {
        data: result.data,
        pagination: result.pagination,
        reset: params.reset ?? false,
        categories: categoriesToUse || [],
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load job posts');
    }
  }
);

const contractorSlice = createSlice({
  name: 'contractor',
  initialState,
  reducers: {
    setRadius: (state, action: PayloadAction<number | null>) => {
      state.radius = action.payload;
    },
    toggleCategory: (state, action: PayloadAction<string>) => {
      if (state.categories.includes(action.payload)) {
        state.categories = state.categories.filter((c) => c !== action.payload);
      } else {
        state.categories = [...state.categories, action.payload];
      }
    },
    setCategories: (state, action: PayloadAction<string[]>) => {
      state.categories = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    resetFilters: (state, action: PayloadAction<{ profileCategories: string[] }>) => {
      state.radius = null;
      state.categories = action.payload.profileCategories;
    },
    clearJobPosts: (state) => {
      state.jobPosts = [];
      state.pagination = null;
    },
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.isRefreshing = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobPosts.pending, (state, action) => {
        if (action.meta.arg.reset) {
          state.isLoading = true;
        } else {
          state.isLoadingMore = true;
        }
        state.error = null;
      })
      .addCase(fetchJobPosts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isLoadingMore = false;
        state.isRefreshing = false;
        
        if (action.payload.reset) {
          state.jobPosts = action.payload.data;
        } else {
          // Deduplicate items by ID
          const existingIds = new Set(state.jobPosts.map((post) => post.id));
          const newItems = action.payload.data.filter(
            (post) => post.id && !existingIds.has(post.id)
          );
          state.jobPosts = [...state.jobPosts, ...newItems];
        }
        
        state.pagination = action.payload.pagination;
        state.categories = action.payload.categories;
        state.error = null;
      })
      .addCase(fetchJobPosts.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoadingMore = false;
        state.isRefreshing = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setRadius,
  toggleCategory,
  setCategories,
  setSearchQuery,
  resetFilters,
  clearJobPosts,
  setRefreshing,
} = contractorSlice.actions;

export default contractorSlice.reducer;

