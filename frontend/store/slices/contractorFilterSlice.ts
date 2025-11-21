import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface IContractorFilterState {
  radius: number | null; // null means "All"
  selectedCategories: string[];
  appliedRadius: number | null; // null means "All"
  appliedCategories: string[];
}

const initialState: IContractorFilterState = {
  radius: null, // Default to "All"
  selectedCategories: [],
  appliedRadius: null, // Default to "All"
  appliedCategories: [],
};

const contractorFilterSlice = createSlice({
  name: 'contractorFilter',
  initialState,
  reducers: {
    setRadius: (state, action: PayloadAction<number | null>) => {
      state.radius = action.payload;
    },
    toggleCategory: (state, action: PayloadAction<string>) => {
      if (state.selectedCategories.includes(action.payload)) {
        state.selectedCategories = state.selectedCategories.filter(
          (c) => c !== action.payload
        );
      } else {
        state.selectedCategories = [...state.selectedCategories, action.payload];
      }
    },
    applyFilters: (state) => {
      state.appliedRadius = state.radius;
      state.appliedCategories = [...state.selectedCategories];
    },
    resetFilters: (state) => {
      state.radius = null; // Reset to "All"
      state.selectedCategories = [];
      state.appliedRadius = null; // Reset to "All"
      state.appliedCategories = [];
    },
    setAppliedFilters: (state, action: PayloadAction<{ radius: number | null; categories: string[] }>) => {
      state.appliedRadius = action.payload.radius;
      state.appliedCategories = action.payload.categories;
      state.radius = action.payload.radius;
      state.selectedCategories = action.payload.categories;
    },
    resetToApplied: (state) => {
      state.radius = state.appliedRadius;
      state.selectedCategories = [...state.appliedCategories];
    },
  },
});

export const { setRadius, toggleCategory, applyFilters, resetFilters, resetToApplied, setAppliedFilters } =
  contractorFilterSlice.actions;
export default contractorFilterSlice.reducer;

