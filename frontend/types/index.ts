/**
 * All application types with I prefix
 */

// User Role Types
export type IUserRole = 'homeowner' | 'contractor' | 'admin';

// API Types
export interface IApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: IUserRole;
}

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

export interface IAuthResponse {
  user: IUser;
  token: string;
}

// Auth State Types
export interface IAuthState {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// Redux Types
export interface IInitializeAuthPayload {
  token: string;
  user: IUser | null;
}

// Notification Types
export type INotificationType = 'success' | 'error' | 'info';

export interface INotificationOptions {
  type: INotificationType;
  text1?: string;
  text2?: string;
  position?: 'top' | 'bottom';
  visibilityTime?: number;
  autoHide?: boolean;
}

