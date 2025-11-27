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
  phone?: string;
  contractorAddress?: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  constructionCategories?: string[];
  notificationEnabled?: boolean;
  notificationRadius?: number;
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

// Job Post Types
export type IJobPostStatus = 'active' | 'closed';

export type IJobSize = 'micro' | 'small' | 'big' | 'very_big';

export interface IJobPost {
  id: string;
  homeownerId: string;
  jobTitle: string;
  jobNumber: string;
  jobSize: IJobSize;
  description: string;
  categories: string[];
  contractorLimit: number;
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  status: IJobPostStatus;
  contractorContactsCount: number;
  hasContacted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  homeowner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ICreateJobPostRequest {
  jobTitle: string;
  jobSize: IJobSize;
  description: string;
  categories: string[];
  contractorLimit: number;
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface IUpdateJobPostRequest {
  jobTitle?: string;
  jobSize?: IJobSize;
  description?: string;
  categories?: string[];
  contractorLimit?: number;
  location?: {
    address?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
}

// Contractor Contact Types
export type IPaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface IContractorContact {
  id: string;
  jobPostId: string;
  contractorId: string;
  homeownerId: string;
  paymentAmount: number;
  paymentStatus: IPaymentStatus;
  paymentTransactionId?: string;
  chatRoomId?: string;
  contactInfoRevealed: boolean;
  createdAt?: string;
  updatedAt?: string;
  contractor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  jobPost?: {
    id: string;
    description: string;
    categories: string[];
    status: IJobPostStatus;
  };
}

export interface ICreateContractorContactRequest {
  jobPostId: string;
  paymentTransactionId?: string;
}

// Chat Types
export interface IChat {
  id: string;
  jobPostId: string;
  homeownerId: string;
  contractorId: string;
  lastMessage?: string;
  lastMessageAt?: string;
  homeownerUnreadCount: number;
  contractorUnreadCount: number;
  createdAt?: string;
  updatedAt?: string;
  homeowner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  contractor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  jobPost?: {
    id: string;
    description: string;
    categories: string[];
    status: IJobPostStatus;
  };
}

// Message Types
export type IMessageType = 'text' | 'image' | 'file';

export interface IMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: IMessageType;
  fileUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt?: string;
  updatedAt?: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

export interface ISendMessageRequest {
  content: string;
  type?: IMessageType;
  fileUrl?: string;
}

