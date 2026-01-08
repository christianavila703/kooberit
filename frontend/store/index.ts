import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import contactReducer from './slices/contactSlice';
import profileReducer from './slices/profileSlice';
import jobReducer from './slices/jobSlice';

const appCombinedReducer = combineReducers({
  auth: authReducer,
  chat: chatReducer,
  contact: contactReducer,
  profile: profileReducer,
  job: jobReducer,
});

export const rootReducer = (state: ReturnType<typeof appCombinedReducer> | undefined, action: { type: string }) => {
  if (action.type === 'auth/reset') {
    state = undefined; // resets everything to initialState
  }
  return appCombinedReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});


export type IRootState = ReturnType<typeof store.getState>;
export type IAppDispatch = typeof store.dispatch;

