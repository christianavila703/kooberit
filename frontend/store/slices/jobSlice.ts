import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { IJob, IJobStatus, IPagination, ICreateJobRequest, IUpdateJobRequest, IProvince } from '@/types';
import jobService from '@/services/job';
import { fetchProfileSettings } from './profileSlice';
import type { IRootState } from '@/store';

interface IJobState {
    contractor: {
        jobs: IJob[];
        filters: {
            status: IJobStatus;
            categories: string[];
            cities: string[];
            province: IProvince;
            searchQuery: string;
            radius: number | null;
        };
        isLoading: boolean;
        isLoadingMore: boolean;
        isRefreshing: boolean;
        pagination: IPagination | null;
        error: string | null;
    };
    homeowner: {
        jobs: IJob[];
        currentJob: IJob | null;
        filters: {
            status: IJobStatus;
        };
        isLoading: boolean;
        isLoadingMore: boolean;
        isRefreshing: boolean;
        pagination: IPagination | null;
        error: string | null;
    };
}

const initialState: IJobState = {
    contractor: {
        jobs: [],
        filters: {
            status: 'all',
            categories: [],
            cities: [],
            province: 'ON',
            searchQuery: '',
            radius: null,
        },
        isLoading: false,
        isLoadingMore: false,
        isRefreshing: false,
        pagination: null,
        error: null,
    },
    homeowner: {
        jobs: [],
        currentJob: null,
        filters: {
            status: 'all',
        },
        isLoading: false,
        isLoadingMore: false,
        isRefreshing: false,
        pagination: null,
        error: null,
    },
};

/**
 * Fetch contractor jobs with filters
 */
export const fetchContractorJobs = createAsyncThunk(
    'job/fetchContractorJobs',
    async (
        params: {
            reset?: boolean;
            page?: number;
            search?: string;
            radius?: number | null;
            categories?: string[];
            cities?: string[];
            province?: IProvince;
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

            // Get state for cities and province, or use params
            const stateForFilters = getState() as IRootState;
            const citiesToUse = params.cities !== undefined
                ? params.cities
                : (stateForFilters.job.contractor.filters.cities.length > 0 
                    ? stateForFilters.job.contractor.filters.cities 
                    : undefined);
            const provinceToUse = params.province || stateForFilters.job.contractor.filters.province || 'ON' as IProvince;

            // Fetch jobs
            const result = await jobService.getContractorJobs({
                status: 'all',
                categories: categoriesToUse,
                cities: citiesToUse,
                province: provinceToUse,
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
            return rejectWithValue(error.message || 'Failed to load jobs');
        }
    }
);

/**
 * Fetch homeowner jobs
 */
export const fetchHomeownerJobs = createAsyncThunk(
    'job/fetchHomeowner',
    async (
        { status, page, limit, append = false }: { status: IJobStatus; page?: number; limit?: number; append?: boolean },
        { rejectWithValue }
    ) => {
        try {
            const result = await jobService.getHomeownerJobs(status, page, limit);
            return { ...result, append };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch jobs');
        }
    }
);

/**
 * Create job
 */
export const createJob = createAsyncThunk(
    'job/create',
    async (data: ICreateJobRequest, { rejectWithValue }) => {
        try {
            const job = await jobService.createJob(data);
            return job;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to create job');
        }
    }
);

/**
 * Fetch job by ID
 */
export const fetchJobById = createAsyncThunk(
    'job/fetchById',
    async (id: string, { rejectWithValue }) => {
        try {
            const job = await jobService.getJobById(id);
            return job;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch job');
        }
    }
);

/**
 * Update job
 */
export const updateJob = createAsyncThunk(
    'job/update',
    async ({ id, data }: { id: string; data: IUpdateJobRequest }, { rejectWithValue }) => {
        try {
            const job = await jobService.updateJob(id, data);
            return job;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to update job');
        }
    }
);

/**
 * Close job
 */
export const closeJob = createAsyncThunk(
    'job/close',
    async (id: string, { rejectWithValue }) => {
        try {
            const job = await jobService.closeJob(id);
            return job;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to close job');
        }
    }
);

/**
 * Delete job
 */
export const deleteJob = createAsyncThunk(
    'job/delete',
    async (id: string, { rejectWithValue }) => {
        try {
            await jobService.deleteJob(id);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to delete job');
        }
    }
);

const jobSlice = createSlice({
    name: 'job',
    initialState,
    reducers: {
        clearError: (state) => {
            state.contractor.error = null;
            state.homeowner.error = null;
        },
        setCurrentJob: (state, action: PayloadAction<IJob | null>) => {
            state.homeowner.currentJob = action.payload;
        },
        setContractorFilters: (state, action: PayloadAction<Partial<IJobState['contractor']['filters']>>) => {
            state.contractor.filters = { ...state.contractor.filters, ...action.payload };
        },
        setRadius: (state, action: PayloadAction<number | null>) => {
            state.contractor.filters.radius = action.payload;
        },
        toggleCategory: (state, action: PayloadAction<string>) => {
            if (state.contractor.filters.categories.includes(action.payload)) {
                state.contractor.filters.categories = state.contractor.filters.categories.filter((c) => c !== action.payload);
            } else {
                state.contractor.filters.categories = [...state.contractor.filters.categories, action.payload];
            }
        },
        setCategories: (state, action: PayloadAction<string[]>) => {
            state.contractor.filters.categories = action.payload;
        },
        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.contractor.filters.searchQuery = action.payload;
        },
        setCities: (state, action: PayloadAction<string[]>) => {
            state.contractor.filters.cities = action.payload;
        },
        setProvince: (state, action: PayloadAction<'ON' | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'PE' | 'QC' | 'SK' | 'NT' | 'NU' | 'YT'>) => {
            state.contractor.filters.province = action.payload;
        },
        resetFilters: (state, action: PayloadAction<{ profileCategories: string[] }>) => {
            state.contractor.filters.radius = null;
            state.contractor.filters.categories = action.payload.profileCategories;
            state.contractor.filters.cities = [];
            state.contractor.filters.province = 'ON';
        },
        clearContractorJobs: (state) => {
            state.contractor.jobs = [];
            state.contractor.pagination = null;
        },
        setRefreshing: (state, action: PayloadAction<boolean>) => {
            state.contractor.isRefreshing = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Fetch contractor jobs
        builder
            .addCase(fetchContractorJobs.pending, (state, action) => {
                if (action.meta.arg.reset) {
                    state.contractor.isLoading = true;
                } else {
                    state.contractor.isLoadingMore = true;
                }
                state.contractor.error = null;
            })
            .addCase(fetchContractorJobs.fulfilled, (state, action) => {
                state.contractor.isLoading = false;
                state.contractor.isLoadingMore = false;
                state.contractor.isRefreshing = false;
                
                if (action.payload.reset) {
                    state.contractor.jobs = action.payload.data;
                } else {
                    // Deduplicate items by ID
                    const existingIds = new Set(state.contractor.jobs.map((job) => job.id));
                    const newItems = action.payload.data.filter(
                        (job) => job.id && !existingIds.has(job.id)
                    );
                    state.contractor.jobs = [...state.contractor.jobs, ...newItems];
                }
                
                state.contractor.pagination = action.payload.pagination;
                state.contractor.filters.categories = action.payload.categories;
                state.contractor.error = null;
            })
            .addCase(fetchContractorJobs.rejected, (state, action) => {
                state.contractor.isLoading = false;
                state.contractor.isLoadingMore = false;
                state.contractor.isRefreshing = false;
                state.contractor.error = action.payload as string;
            });

        // Fetch homeowner jobs
        builder
            .addCase(fetchHomeownerJobs.pending, (state) => {
                state.homeowner.isLoading = true;
                state.homeowner.error = null;
            })
            .addCase(fetchHomeownerJobs.fulfilled, (state, action) => {
                state.homeowner.isLoading = false;
                if (action.payload.append) {
                    // Append new data for infinite scroll
                    const existingIds = new Set(state.homeowner.jobs.map((j) => j.id));
                    const newJobs = action.payload.data.filter((j) => !existingIds.has(j.id));
                    state.homeowner.jobs = [...state.homeowner.jobs, ...newJobs];
                } else {
                    // Replace data for initial load or refresh
                    state.homeowner.jobs = action.payload.data;
                }
                state.homeowner.error = null;
            })
            .addCase(fetchHomeownerJobs.rejected, (state, action) => {
                state.homeowner.isLoading = false;
                state.homeowner.error = action.payload as string;
            });

        // Create job
        builder
            .addCase(createJob.pending, (state) => {
                state.homeowner.isLoading = true;
                state.homeowner.error = null;
            })
            .addCase(createJob.fulfilled, (state, action) => {
                state.homeowner.isLoading = false;
                state.homeowner.jobs.unshift(action.payload);
                state.homeowner.currentJob = action.payload;
                state.homeowner.error = null;
            })
            .addCase(createJob.rejected, (state, action) => {
                state.homeowner.isLoading = false;
                state.homeowner.error = action.payload as string;
            });

        // Fetch job by ID
        builder
            .addCase(fetchJobById.pending, (state) => {
                state.homeowner.isLoading = true;
                state.homeowner.error = null;
            })
            .addCase(fetchJobById.fulfilled, (state, action) => {
                state.homeowner.isLoading = false;
                state.homeowner.currentJob = action.payload;
                // Update in list if exists
                const index = state.homeowner.jobs.findIndex((j) => j.id === action.payload.id);
                if (index !== -1) {
                    state.homeowner.jobs[index] = action.payload;
                }
                state.homeowner.error = null;
            })
            .addCase(fetchJobById.rejected, (state, action) => {
                state.homeowner.isLoading = false;
                state.homeowner.error = action.payload as string;
            });

        // Update job
        builder
            .addCase(updateJob.pending, (state) => {
                state.homeowner.isLoading = true;
                state.homeowner.error = null;
            })
            .addCase(updateJob.fulfilled, (state, action) => {
                state.homeowner.isLoading = false;
                const index = state.homeowner.jobs.findIndex((j) => j.id === action.payload.id);
                if (index !== -1) {
                    state.homeowner.jobs[index] = action.payload;
                }
                if (state.homeowner.currentJob?.id === action.payload.id) {
                    state.homeowner.currentJob = action.payload;
                }
                state.homeowner.error = null;
            })
            .addCase(updateJob.rejected, (state, action) => {
                state.homeowner.isLoading = false;
                state.homeowner.error = action.payload as string;
            });

        // Close job
        builder
            .addCase(closeJob.pending, (state) => {
                state.homeowner.isLoading = true;
                state.homeowner.error = null;
            })
            .addCase(closeJob.fulfilled, (state, action) => {
                state.homeowner.isLoading = false;
                const index = state.homeowner.jobs.findIndex((j) => j.id === action.payload.id);
                if (index !== -1) {
                    state.homeowner.jobs[index] = action.payload;
                }
                if (state.homeowner.currentJob?.id === action.payload.id) {
                    state.homeowner.currentJob = action.payload;
                }
                state.homeowner.error = null;
            })
            .addCase(closeJob.rejected, (state, action) => {
                state.homeowner.isLoading = false;
                state.homeowner.error = action.payload as string;
            });

        // Delete job
        builder
            .addCase(deleteJob.pending, (state) => {
                state.homeowner.isLoading = true;
                state.homeowner.error = null;
            })
            .addCase(deleteJob.fulfilled, (state, action) => {
                state.homeowner.isLoading = false;
                state.homeowner.jobs = state.homeowner.jobs.filter((j) => j.id !== action.payload);
                if (state.homeowner.currentJob?.id === action.payload) {
                    state.homeowner.currentJob = null;
                }
                state.homeowner.error = null;
            })
            .addCase(deleteJob.rejected, (state, action) => {
                state.homeowner.isLoading = false;
                state.homeowner.error = action.payload as string;
            });
    },
});

export const {
    clearError,
    setCurrentJob,
    setContractorFilters,
    setRadius,
    toggleCategory,
    setCategories,
    setSearchQuery,
    setCities,
    setProvince,
    resetFilters,
    clearContractorJobs,
    setRefreshing,
} = jobSlice.actions;
export default jobSlice.reducer;