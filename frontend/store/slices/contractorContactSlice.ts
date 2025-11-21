import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import contractorContactService from '@/services/contractorContact';
import type { IContractorContact } from '@/types';

interface IContractorContactState {
  contacts: IContractorContact[];
  isLoading: boolean;
  error: string | null;
}

const initialState: IContractorContactState = {
  contacts: [],
  isLoading: false,
  error: null,
};

/**
 * Fetch contractor contacts by job post
 */
export const fetchContractorContactsByJobPost = createAsyncThunk(
  'contractorContact/fetchByJobPost',
  async (jobPostId: string, { rejectWithValue }) => {
    try {
      const contacts = await contractorContactService.getContractorContactsByJobPost(jobPostId);
      return { jobPostId, contacts };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch contractor contacts');
    }
  }
);

/**
 * Fetch homeowner contractor contacts
 */
export const fetchHomeownerContractorContacts = createAsyncThunk(
  'contractorContact/fetchHomeowner',
  async (_, { rejectWithValue }) => {
    try {
      const contacts = await contractorContactService.getHomeownerContractorContacts();
      return contacts;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch contractor contacts');
    }
  }
);

const contractorContactSlice = createSlice({
  name: 'contractorContact',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContractorContactsByJobPost.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchContractorContactsByJobPost.fulfilled, (state, action) => {
        state.isLoading = false;
        // Store contacts by job post ID
        state.contacts = action.payload.contacts;
        state.error = null;
      })
      .addCase(fetchContractorContactsByJobPost.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchHomeownerContractorContacts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHomeownerContractorContacts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.contacts = action.payload;
        state.error = null;
      })
      .addCase(fetchHomeownerContractorContacts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = contractorContactSlice.actions;
export default contractorContactSlice.reducer;

