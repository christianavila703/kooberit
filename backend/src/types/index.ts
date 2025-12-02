import { Document, Types } from 'mongoose';
import type { UserRole, UserAllowStatus } from '@enums';

/**
 * Custom error interface
 */
export interface TCustomError extends Error {
  statusCode: number;
  message: string;
}

/**
 * JWT types
 */
export interface IJwtPayload {
  id: string;
  email: string;
}

/**
 * Pagination types
 */
export interface IPaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Auth types
 */
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
  role?: UserRole;
  status?: UserAllowStatus;
}

export interface IAuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    companyName?: string;
    role: UserRole;
    status: UserAllowStatus;
    uniqueId?: number;
  };
  token: string;
}

/**
 * User types
 */
export interface IUserAttributes {
  id?: string;
  _id?: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserAllowStatus;
  uniqueId?: number;
  lastLogin?: Date;
  contractorAddress?: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  notificationEnabled?: boolean;
  notificationRadius?: number;
  phone?: string;
  companyName?: string;
  constructionCategories?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type IUserCreationAttributes = Omit<IUserAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt'>;
export type IUserDocument = IUserAttributes & Document<Types.ObjectId>;

export interface IUserPaginationOptions extends IPaginationOptions {
  role?: UserRole;
  status?: UserAllowStatus;
}

export type { UserRole, UserAllowStatus } from '@enums';

/**
 * Job Post types
 */
export type JobPostStatus = 'active' | 'closed';

export type JobSize = 'micro' | 'small' | 'big' | 'very_big';

export interface IJobPostAttributes {
  id?: string;
  _id?: Types.ObjectId;
  homeownerId: Types.ObjectId;
  jobTitle: string;
  jobNumber: string;
  jobSize: JobSize;
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
  status: JobPostStatus;
  contractorContactsCount: number;
  notificationsChecked?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IJobPostCreationAttributes = Omit<IJobPostAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt' | 'contractorContactsCount'>;
export type IJobPostDocument = IJobPostAttributes & Document<Types.ObjectId>;

/**
 * Contractor Contact types
 */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface IContractorContactAttributes {
  id?: string;
  _id?: Types.ObjectId;
  jobPostId: Types.ObjectId;
  contractorId: Types.ObjectId;
  homeownerId: Types.ObjectId;
  paymentAmount: number;
  paymentStatus: PaymentStatus;
  paymentTransactionId?: string;
  chatRoomId?: Types.ObjectId;
  contactInfoRevealed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IContractorContactCreationAttributes = Omit<IContractorContactAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt' | 'contactInfoRevealed'>;
export type IContractorContactDocument = IContractorContactAttributes & Document<Types.ObjectId>;

/**
 * Chat types
 */
export interface IChatAttributes {
  id?: string;
  _id?: Types.ObjectId;
  jobPostId: Types.ObjectId;
  homeownerId: Types.ObjectId;
  contractorId: Types.ObjectId;
  lastMessage?: string;
  lastMessageAt?: Date;
  homeownerUnreadCount: number;
  contractorUnreadCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IChatCreationAttributes = Omit<IChatAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt' | 'homeownerUnreadCount' | 'contractorUnreadCount'>;
export type IChatDocument = IChatAttributes & Document<Types.ObjectId>;

/**
 * Message types
 */
export type MessageType = 'text' | 'image' | 'file';

export interface IMessageAttributes {
  id?: string;
  _id?: Types.ObjectId;
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  type: MessageType;
  fileUrl?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IMessageCreationAttributes = Omit<IMessageAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt' | 'isRead'>;
export type IMessageDocument = IMessageAttributes & Document<Types.ObjectId>;

/**
 * Payment Log types
 */
export interface IPaymentLogAttributes {
  id?: string;
  _id?: Types.ObjectId;
  contractorContactId?: Types.ObjectId;
  jobPostId: Types.ObjectId;
  contractorId: Types.ObjectId;
  homeownerId: Types.ObjectId;
  paymentAmount: number;
  paymentStatus: PaymentStatus;
  paymentTransactionId?: string;
  stripePaymentIntentId?: string;
  stripePaymentMethodId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPaymentLogCreationAttributes {
  contractorContactId?: string | Types.ObjectId;
  jobPostId: string | Types.ObjectId;
  contractorId: string | Types.ObjectId;
  homeownerId: string | Types.ObjectId;
  paymentAmount: number;
  paymentStatus: PaymentStatus;
  paymentTransactionId?: string;
  stripePaymentIntentId?: string;
  stripePaymentMethodId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export type IPaymentLogDocument = IPaymentLogAttributes & Document<Types.ObjectId>;