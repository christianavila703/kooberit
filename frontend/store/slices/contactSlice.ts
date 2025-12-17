import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import contactService from '@/services/contact';
import type { IContact } from '@/types';

interface IContactState {
  contacts: IContact[];
  isLoading: boolean;
  error: string | null;
}

const initialState: IContactState = {
  contacts: [],
  isLoading: false,
  error: null,
};

/**
 * Fetch contacts by job post
 */
export const fetchContactsByJobPost = createAsyncThunk(
  'contact/fetchByJobPost',
  async (jobPostId: string, { rejectWithValue }) => {
    try {
      const contacts = await contactService.getContactsByJobPost(jobPostId);
      return { jobPostId, contacts };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch contacts');
    }
  }
);

/**
 * Fetch homeowner contacts
 */
export const fetchHomeownerContacts = createAsyncThunk(
  'contact/fetchHomeowner',
  async (_, { rejectWithValue }) => {
    try {
      const contacts = await contactService.getHomeownerContacts();
      return contacts;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch contacts');
    }
  }
);

const contactSlice = createSlice({
  name: 'contact',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContactsByJobPost.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchContactsByJobPost.fulfilled, (state, action) => {
        state.isLoading = false;
        // Store contacts by job post ID
        state.contacts = action.payload.contacts;
        state.error = null;
      })
      .addCase(fetchContactsByJobPost.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchHomeownerContacts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHomeownerContacts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.contacts = action.payload;
        state.error = null;
      })
      .addCase(fetchHomeownerContacts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = contactSlice.actions;
export default contactSlice.reducer;

