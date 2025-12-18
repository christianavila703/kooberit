import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import contactReducer from './slices/contactSlice';
import profileReducer from './slices/profileSlice';
import jobReducer from './slices/jobSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    contact: contactReducer,
    profile: profileReducer,
    job: jobReducer,
  },
});

export type IRootState = ReturnType<typeof store.getState>;
export type IAppDispatch = typeof store.dispatch;

