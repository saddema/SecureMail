export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'team-leader' | 'agent' | 'bde';
  password: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  canSendAttachments?: boolean;
  department?: string;
}

export interface Email {
  id: string;
  senderId: string;
  subject: string;
  body: string;
  recipientIds: string[]; // Array of user IDs (To)
  ccRecipientIds?: string[]; // Array of user IDs (CC)
  attachments?: {
    name: string;
    size: number;
    type: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  sentAt: Date;
}

export interface EmailRead {
  id: string;
  emailId: string;
  userId: string;
  readAt: Date;
  createdAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'team-leader' | 'agent' | 'bde';
  isActive: boolean;
  canSendAttachments?: boolean;
  department?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'agent' | 'bde';
  password: string;
}

export interface ComposeEmailData {
  recipients: string[];
  ccRecipients: string[];
  subject: string;
  body: string;
}

export interface EmailWithSender extends Email {
  sender: {
    firstName: string;
    lastName: string;
    email: string;
  };
  isRead?: boolean;
  readAt?: Date;
}

export interface EmailWithReadStatus extends EmailWithSender {
  readStatus: {
    [userId: string]: {
      isRead: boolean;
      readAt?: Date;
      user: {
        firstName: string;
        lastName: string;
        email: string;
      };
    };
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type UserRole = 'admin' | 'manager' | 'team-leader' | 'agent' | 'bde';

export interface UserPermissions {
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canComposeEmails: boolean;
  canViewAllEmails: boolean;
  canTrackReadStatus: boolean;
  canReply: boolean;
  canForward: boolean;
}

export interface DistributionList {
  id: string;
  name: string;
  description?: string;
  emails: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface DistributionListMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  addedAt: string;
}

export interface CSVUploadData {
  file: File;
  listName: string;
  description?: string;
}

export interface CSVParseResult {
  success: boolean;
  error?: string;
  validMembers: DistributionListMember[];
  invalidRows: Array<{ row: number; data: string[]; errors: string[] }>;
  totalRows: number;
}