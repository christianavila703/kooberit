import { Document, Types } from 'mongoose';
import type { UserRole, UserAllowStatus } from '@enums';

export type IProvince = 'ON' | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'PE' | 'QC' | 'SK' | 'NT' | 'NU' | 'YT';

export type IJobSize = 'micro' | 'small' | 'big' | 'very_big';

export type IJobStatus = 'all' | 'pending' | 'closed' | 'open' | 'awaiting' | 'accepted' | 'completed' | 'cancelled';

export type IStructureType = 'single_detached_house' | 'semi_detached_house' | 'townhouse' | 'low_rise_building' | 'high_rise_building';

export type IPaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

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
  companyName: string;
  role?: UserRole;
  status?: UserAllowStatus;
  inviteCode?: string; // Optional invite code for external invitations
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
    streetNumber?: string;
    streetName?: string;
    unitNumber?: string;
    cityName?: string;
    areaCode?: string;
    province?: IProvince;
  };
  notificationEnabled?: boolean;
  notificationRadius?: number;
  phone?: string;
  companyName?: string;
  constructionCategories?: string[];
  emailVerified?: boolean;
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
 * Job types
 */

export interface IJobAttributes {
  id?: string;
  _id?: Types.ObjectId;
  homeownerId: Types.ObjectId;
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
  notificationsChecked?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IJobCreationAttributes = Omit<IJobAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt' | 'contractorContactsCount'>;
export type IJobDocument = IJobAttributes & Document<Types.ObjectId>;

/**
 * Contractor Contact types
 */
export interface IContactAttributes {
  id?: string;
  _id?: Types.ObjectId;
  jobId: Types.ObjectId;
  contractorId: Types.ObjectId;
  homeownerId: Types.ObjectId;
  paymentAmount: number;
  paymentStatus: IPaymentStatus;
  paymentTransactionId?: string;
  chatRoomId?: Types.ObjectId;
  contactInfoRevealed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IContactCreationAttributes = Omit<IContactAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt' | 'contactInfoRevealed'>;
export type IContactDocument = IContactAttributes & Document<Types.ObjectId>;

/**
 * Chat types
 */
export interface IChatAttributes {
  id?: string;
  _id?: Types.ObjectId;
  jobId: Types.ObjectId;
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
export type MessageType = 'text' | 'image' | 'file' | 'system';

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
  contactId?: Types.ObjectId;
  jobId: Types.ObjectId;
  contractorId: Types.ObjectId;
  homeownerId: Types.ObjectId;
  paymentAmount: number;
  paymentStatus: IPaymentStatus;
  paymentTransactionId?: string;
  stripePaymentIntentId?: string;
  stripePaymentMethodId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPaymentLogCreationAttributes {
  contactId?: string | Types.ObjectId;
  jobId: string | Types.ObjectId;
  contractorId: string | Types.ObjectId;
  homeownerId: string | Types.ObjectId;
  paymentAmount: number;
  paymentStatus: IPaymentStatus;
  paymentTransactionId?: string;
  stripePaymentIntentId?: string;
  stripePaymentMethodId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export type IPaymentLogDocument = IPaymentLogAttributes & Document<Types.ObjectId>;

/**
 * Invitation types
 */
export type InviteType = 'homeowner' | 'contractor';
export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export interface IInvitationAttributes {
  id?: string;
  _id?: Types.ObjectId;
  inviteCode: string;
  inviterUserId: Types.ObjectId;
  inviteeEmail: string;
  inviteType: InviteType;
  status: InvitationStatus;
  jobId?: Types.ObjectId; // For internal invitations (inviting to a specific job)
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedUserId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IInvitationCreationAttributes = Omit<IInvitationAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt' | 'status' | 'acceptedAt' | 'acceptedUserId'>;
export type IInvitationDocument = IInvitationAttributes & Document<Types.ObjectId>;