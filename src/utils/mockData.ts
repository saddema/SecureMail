import { User, Email, EmailRead, EmailWithSender, EmailWithReadStatus, UserPermissions } from '../types';
import dbOperations, { initializeDatabase } from './database';

// Initialize database when module loads
initializeDatabase();

// Export functions to get data (now async)
export const getUsers = async (): Promise<User[]> => {
  return await dbOperations.getUsers();
};

export const getEmails = async (): Promise<Email[]> => {
  return await dbOperations.getEmails();
};

export const getEmailReads = async (): Promise<EmailRead[]> => {
  return await dbOperations.getEmailReads();
};

// Helper function to get user by ID
export const getUserById = async (id: string): Promise<User | undefined> => {
  return await dbOperations.getUserById(id);
};

// Helper function to get emails with sender information for a specific user
export const getEmailsWithSender = async (userId?: string, archived?: boolean): Promise<(Email & { sender: User; isRead?: boolean; readAt?: Date })[]> => {
  const emails = await dbOperations.getEmails(userId, archived);
  const emailReads = await dbOperations.getEmailReads();
  const emailsWithSender = [];
  
  for (const email of emails) {
    const sender = await dbOperations.getUserById(email.senderId);
    if (sender) {
      // Check if this email has been read by the specific user (if userId provided)
      let isRead = false;
      let readAt = undefined;
      
      if (userId) {
        const emailReadRecord = emailReads.find(read => read.emailId === email.id && read.userId === userId);
        isRead = !!emailReadRecord;
        readAt = emailReadRecord?.readAt;
      } else {
        // If no userId provided, check if read by any user
        const emailReadRecord = emailReads.find(read => read.emailId === email.id);
        isRead = !!emailReadRecord;
        readAt = emailReadRecord?.readAt;
      }
      
      emailsWithSender.push({ 
        ...email, 
        sender, 
        isRead, 
        readAt 
      });
    }
  }
  
  return emailsWithSender;
};

// Helper function to get sent emails with read status
export const getSentEmailsWithReadStatus = async (userId: string): Promise<(Email & { readCount: number; totalRecipients: number })[]> => {
  const emails = await dbOperations.getEmails(userId);
  const emailReads = await dbOperations.getEmailReads();
  
  return emails
    .filter(email => email.senderId === userId)
    .map(email => {
      const readCount = emailReads.filter(read => read.emailId === email.id).length;
      return {
        ...email,
        readCount,
        totalRecipients: email.recipientIds.length
      };
    });
};

// Helper function to mark email as read
export const markEmailAsRead = async (emailId: string, userId: string): Promise<void> => {
  await dbOperations.markEmailAsRead(emailId, userId);
};

// Helper function to mark email as unread
export const markEmailAsUnread = async (emailId: string, userId: string): Promise<void> => {
  await dbOperations.markEmailAsUnread(emailId, userId);
};

// Helper function to get user permissions based on role
export const getUserPermissions = (role: string) => {
  switch (role) {
    case 'admin':
      return {
        canCreateUsers: true,
        canEditUsers: true,
        canDeleteUsers: true,
        canComposeEmails: true,
        canViewAllEmails: true,
        canTrackReadStatus: true,
        canReply: true,
        canForward: true,
      };
    case 'manager':
    case 'team-leader':
      return {
        canCreateUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canComposeEmails: true,
        canViewAllEmails: false,
        canTrackReadStatus: true,
        canReply: true,
        canForward: true,
      };
    case 'bde':
      return {
        canCreateUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canComposeEmails: true,
        canViewAllEmails: false,
        canTrackReadStatus: true,
        canReply: true,
        canForward: true,
      };
    case 'agent':
      return {
        canCreateUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canComposeEmails: false,
        canViewAllEmails: false,
        canTrackReadStatus: false,
        canReply: false,
        canForward: false,
      };
    default:
      return {
        canCreateUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canComposeEmails: false,
        canViewAllEmails: false,
        canTrackReadStatus: false,
        canReply: false,
        canForward: false,
      };
  }
};