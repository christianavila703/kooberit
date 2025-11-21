import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import jobPostService from '@/services/jobPost';
import type {
  IJobPost,
  ICreateJobPostRequest,
  IUpdateJobPostRequest,
} from '@/types';

interface IJobPostState {
  jobPosts: IJobPost[];
  currentJobPost: IJobPost | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: IJobPostState = {
  jobPosts: [],
  currentJobPost: null,
  isLoading: false,
  error: null,
};

/**
 * Fetch homeowner job posts
 */
export const fetchHomeownerJobPosts = createAsyncThunk(
  'jobPost/fetchHomeowner',
  async (
    { status, page, limit, append = false }: { status?: 'active' | 'closed'; page?: number; limit?: number; append?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const result = await jobPostService.getHomeownerJobPosts(status, page, limit);
      return { ...result, append };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch job posts');
    }
  }
);

/**
 * Create job post
 */
export const createJobPost = createAsyncThunk(
  'jobPost/create',
  async (data: ICreateJobPostRequest, { rejectWithValue }) => {
    try {
      const jobPost = await jobPostService.createJobPost(data);
      return jobPost;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create job post');
    }
  }
);

/**
 * Fetch job post by ID
 */
export const fetchJobPostById = createAsyncThunk(
  'jobPost/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const jobPost = await jobPostService.getJobPostById(id);
      return jobPost;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch job post');
    }
  }
);

/**
 * Update job post
 */
export const updateJobPost = createAsyncThunk(
  'jobPost/update',
  async ({ id, data }: { id: string; data: IUpdateJobPostRequest }, { rejectWithValue }) => {
    try {
      const jobPost = await jobPostService.updateJobPost(id, data);
      return jobPost;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update job post');
    }
  }
);

/**
 * Close job post
 */
export const closeJobPost = createAsyncThunk(
  'jobPost/close',
  async (id: string, { rejectWithValue }) => {
    try {
      const jobPost = await jobPostService.closeJobPost(id);
      return jobPost;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to close job post');
    }
  }
);

/**
 * Delete job post
 */
export const deleteJobPost = createAsyncThunk(
  'jobPost/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await jobPostService.deleteJobPost(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete job post');
    }
  }
);

const jobPostSlice = createSlice({
  name: 'jobPost',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentJobPost: (state, action: PayloadAction<IJobPost | null>) => {
      state.currentJobPost = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch homeowner job posts
    builder
      .addCase(fetchHomeownerJobPosts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHomeownerJobPosts.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.append) {
          // Append new data for infinite scroll
          const existingIds = new Set(state.jobPosts.map((jp) => jp.id));
          const newPosts = action.payload.data.filter((jp) => !existingIds.has(jp.id));
          state.jobPosts = [...state.jobPosts, ...newPosts];
        } else {
          // Replace data for initial load or refresh
          state.jobPosts = action.payload.data;
        }
        state.error = null;
      })
      .addCase(fetchHomeownerJobPosts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create job post
    builder
      .addCase(createJobPost.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createJobPost.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobPosts.unshift(action.payload);
        state.currentJobPost = action.payload;
        state.error = null;
      })
      .addCase(createJobPost.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch job post by ID
    builder
      .addCase(fetchJobPostById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchJobPostById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentJobPost = action.payload;
        // Update in list if exists
        const index = state.jobPosts.findIndex((jp) => jp.id === action.payload.id);
        if (index !== -1) {
          state.jobPosts[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(fetchJobPostById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update job post
    builder
      .addCase(updateJobPost.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateJobPost.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.jobPosts.findIndex((jp) => jp.id === action.payload.id);
        if (index !== -1) {
          state.jobPosts[index] = action.payload;
        }
        if (state.currentJobPost?.id === action.payload.id) {
          state.currentJobPost = action.payload;
        }
        state.error = null;
      })
      .addCase(updateJobPost.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Close job post
    builder
      .addCase(closeJobPost.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(closeJobPost.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.jobPosts.findIndex((jp) => jp.id === action.payload.id);
        if (index !== -1) {
          state.jobPosts[index] = action.payload;
        }
        if (state.currentJobPost?.id === action.payload.id) {
          state.currentJobPost = action.payload;
        }
        state.error = null;
      })
      .addCase(closeJobPost.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete job post
    builder
      .addCase(deleteJobPost.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteJobPost.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobPosts = state.jobPosts.filter((jp) => jp.id !== action.payload);
        if (state.currentJobPost?.id === action.payload) {
          state.currentJobPost = null;
        }
        state.error = null;
      })
      .addCase(deleteJobPost.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentJobPost } = jobPostSlice.actions;
export default jobPostSlice.reducer;

