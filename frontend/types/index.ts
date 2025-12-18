/**
 * All application types with I prefix
 */

// User Role Types
export type IUserRole = 'homeowner' | 'contractor' | 'admin';

export type IProvince = 'ON' | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'PE' | 'QC' | 'SK' | 'NT' | 'NU' | 'YT';

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
  companyName?: string;
  role?: IUserRole;
}

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  uniqueId?: number;
  phone?: string;
  companyName?: string;
  contractorAddress?: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    streetNumber?: string;
    streetName?: string;
    unitNumber?: string;
    cityName?: string;
    areaCode?: string;
    province?: IProvince;
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
export type IMode = 'contractor' | 'homeowner';

export interface IAuthState {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  mode: IMode;
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

// Pagination Types
export interface IPagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Job Types
export type IJobStatus = 'all' | 'pending' | 'closed' | 'open' | 'awaiting' | 'accepted' | 'completed' | 'cancelled';

export type IJobSize = 'micro' | 'small' | 'big' | 'very_big';

export type IJobType = 'single detached house' | 'semi detached house' | 'townhouse' | 'low rise building' | 'high rise building';

export type IJob = {
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
    streetNumber?: string;
    streetName?: string;
    unitNumber?: string;
    cityName: string;
    areaCode?: string;
    province: IProvince;
  };
  status: IJobStatus;
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






// Job Request Types (aliases for backward compatibility during migration)
export interface ICreateJobRequest {
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
    streetNumber?: string;
    streetName?: string;
    unitNumber?: string;
    cityName: string;
    areaCode?: string;
    province: IProvince;
  };
}

export interface IUpdateJobRequest {
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
    streetNumber?: string;
    streetName?: string;
    unitNumber?: string;
    cityName?: string;
    areaCode?: string;
    province?: IProvince;
  };
}

// Contractor Contact Types
export type IPaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface IContact {
  id: string;
  jobId: string;
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
  job?: {
    id: string;
    description: string;
    categories: string[];
    status: IJobStatus;
  };
}

export interface ICreateContactRequest {
  jobId: string;
  paymentTransactionId?: string;
}

// Chat Types
export interface IChat {
  id: string;
  jobId: string;
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
  job?: {
    id: string;
    description: string;
    categories: string[];
    status: IJobStatus;
  };
}

// Message Types
export type IMessageType = 'text' | 'image' | 'file' | 'system';

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

