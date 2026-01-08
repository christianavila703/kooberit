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
  inviteCode?: string;
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
export type IJobStatus = 'all' | 'pending' | 'closed' | 'open' | 'awaiting' | 'accepted' | 'awarded' | 'completed' | 'cancelled';

export type IJobSize = 'micro' | 'small' | 'big' | 'very_big';

export type IStructureType = 'single_detached_house' | 'semi_detached_house' | 'townhouse' | 'low_rise_building' | 'high_rise_building';

export type IJob = {
  id: string;
  homeownerId: string;
  jobTitle: string;
  jobNumber: string;
  jobSize: IJobSize;
  structureType: IStructureType;
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
  hasInvitation?: boolean;
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
  structureType: IStructureType;
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
  structureType?: IStructureType;
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

// Bid Types
export type IBidStatus = 'pending' | 'awarded' | 'rejected';

export interface IBid {
  id: string;
  jobId: string;
  contractorId: string;
  homeownerId: string;
  bidValue: number;
  projectDueDate: string;
  awardFee: number;
  awardFeeStatus: IPaymentStatus;
  bidStatus: IBidStatus;
  awardedAt?: string;
  awardFeePaymentIntentId?: string;
  awardFeePaymentMethodId?: string;
  awardFeeTransactionId?: string;
  completionPrompted?: boolean;
  completedOnTime?: boolean;
  completedWithinBudget?: boolean;
  onTimeEfficiencyPoints?: number;
  onBudgetEfficiencyPoints?: number;
  passFeeToHomeowner?: boolean;
  createdAt?: string;
  updatedAt?: string;
  contractor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    companyName?: string;
  };
  homeowner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  job?: {
    id: string;
    jobTitle: string;
    jobNumber: string;
    description: string;
  };
}

export interface ICreateBidRequest {
  jobId: string;
  bidValue: number;
  projectDueDate: string;
  passFeeToHomeowner?: boolean;
}

// Extension Request Types
export type IExtensionRequestType = 'date_extension' | 'budget_change';
export type IExtensionRequestStatus = 'pending' | 'approved' | 'rejected';

export interface IExtensionRequest {
  id: string;
  bidId: string;
  jobId: string;
  contractorId: string;
  homeownerId: string;
  requestType: IExtensionRequestType;
  newDate?: string;
  newBudget?: number;
  explanation: string;
  status: IExtensionRequestStatus;
  respondedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  contractor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    companyName?: string;
  };
  bid?: {
    id: string;
    bidValue: number;
    projectDueDate: string;
  };
  job?: {
    id: string;
    jobTitle: string;
    jobNumber: string;
  };
}

export interface ICreateExtensionRequestRequest {
  bidId: string;
  requestType: IExtensionRequestType;
  newDate?: string;
  newBudget?: number;
  explanation: string;
}

export interface IRespondToExtensionRequestRequest {
  status: 'approved' | 'rejected';
}

export interface IUpdateCompletionStatusRequest {
  completedOnTime: boolean;
  completedWithinBudget: boolean;
}

