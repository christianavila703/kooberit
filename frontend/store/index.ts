import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import jobPostReducer from './slices/jobPostSlice';
import chatReducer from './slices/chatSlice';
import contactReducer from './slices/contactSlice';
import contractorReducer from './slices/contractorSlice';
import profileReducer from './slices/profileSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    jobPost: jobPostReducer,
    chat: chatReducer,
    contact: contactReducer,
    contractor: contractorReducer,
    profile: profileReducer,
  },
});

export type IRootState = ReturnType<typeof store.getState>;
export type IAppDispatch = typeof store.dispatch;

