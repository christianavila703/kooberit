import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import jobPostReducer from './slices/jobPostSlice';
import chatReducer from './slices/chatSlice';
import contractorContactReducer from './slices/contractorContactSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    jobPost: jobPostReducer,
    chat: chatReducer,
    contractorContact: contractorContactReducer,
  },
});

export type IRootState = ReturnType<typeof store.getState>;
export type IAppDispatch = typeof store.dispatch;

