// Database operations using API calls to the backend server
import { User, Email, EmailRead } from '../types';
import { apiClient } from './api';

// Initialize database - this will be handled by the backend
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Check if backend is running
    const isHealthy = await apiClient.healthCheck();
    if (!isHealthy) {
      throw new Error('Backend server is not running');
    }
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

// Database operations using API calls
export const dbOperations = {
  // User operations
  async getUsers(): Promise<User[]> {
    try {
      return await apiClient.getUsers();
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  },

  async getUserById(id: string): Promise<User | undefined> {
    try {
      const user = await apiClient.getUserById(id);
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return undefined;
    }
  },

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const users = await this.getUsers();
      return users.find(user => user.email === email);
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  },

  async addUser(user: User): Promise<void> {
    try {
      await apiClient.addUser(user);
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  },

  async updateUser(updatedUser: User): Promise<void> {
    try {
      await apiClient.updateUser(updatedUser.id, updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  async deleteUser(id: string): Promise<void> {
    try {
      await apiClient.deleteUser(id);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // Password operations
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.changePassword(userId, currentPassword, newPassword);
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },

  async resetPassword(userId: string, adminUserId: string): Promise<{ message: string; temporaryPassword: string }> {
    try {
      return await apiClient.resetPassword(userId, adminUserId);
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  },

  // Attachment permission operations
  async updateAttachmentPermission(userId: string, canSendAttachments: boolean, adminUserId: string): Promise<{ message: string; canSendAttachments: boolean; userId: string; userName: string; userEmail: string; userRole: string }> {
    try {
      return await apiClient.updateAttachmentPermission(userId, canSendAttachments, adminUserId);
    } catch (error) {
      console.error('Error updating attachment permission:', error);
      throw error;
    }
  },

  // Email operations
  async getEmails(userId?: string, archived?: boolean): Promise<Email[]> {
    try {
      return await apiClient.getEmails(userId, archived);
    } catch (error) {
      console.error('Error getting emails:', error);
      return [];
    }
  },

  async addEmail(email: Email): Promise<void> {
    try {
      await apiClient.addEmail(email);
    } catch (error) {
      console.error('Error adding email:', error);
      throw error;
    }
  },

  async deleteEmail(id: string, userId: string): Promise<void> {
    try {
      await apiClient.deleteEmail(id, userId);
    } catch (error) {
      console.error('Error deleting email:', error);
      throw error;
    }
  },

  async bulkArchiveEmails(emailIds: string[], userId: string): Promise<void> {
    try {
      await apiClient.bulkArchiveEmails(emailIds, userId);
    } catch (error) {
      console.error('Error bulk archiving emails:', error);
      throw error;
    }
  },

  async unarchiveEmail(emailId: string, userId: string): Promise<void> {
    try {
      await apiClient.unarchiveEmail(emailId, userId);
    } catch (error) {
      console.error('Error unarchiving email:', error);
      throw error;
    }
  },

  // Email read operations
  async getEmailReads(): Promise<EmailRead[]> {
    try {
      return await apiClient.getEmailReads();
    } catch (error) {
      console.error('Error getting email reads:', error);
      return [];
    }
  },

  async markEmailAsRead(emailId: string, userId: string): Promise<void> {
    try {
      await apiClient.markEmailAsRead(emailId, userId);
    } catch (error) {
      console.error('Error marking email as read:', error);
      throw error;
    }
  },

  async markEmailAsUnread(emailId: string, userId: string): Promise<void> {
    try {
      await apiClient.markEmailAsUnread(emailId, userId);
    } catch (error) {
      console.error('Error marking email as unread:', error);
      throw error;
    }
  },

  // Active Session operations (for live queue)
  async getActiveSessions(adminUserId: string): Promise<any[]> {
    try {
      console.log('Database: Getting active sessions for admin:', adminUserId);
      const result = await apiClient.getActiveSessions(adminUserId);
      console.log('Database: Received sessions:', result);
      return result;
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
  },

  // Admin operations for message log
  async getAllEmailsForAdmin(adminUserId: string): Promise<Email[]> {
    try {
      return await apiClient.getAllEmails(adminUserId);
    } catch (error) {
      console.error('Error getting all emails for admin:', error);
      return [];
    }
  },

  async searchMessagesForAdmin(params: {
    query?: string;
    senderId?: string;
    recipientId?: string;
    dateFrom?: string;
    dateTo?: string;
    hasAttachments?: boolean;
    isRead?: boolean;
    priority?: string;
  }): Promise<Email[]> {
    try {
      return await apiClient.searchMessages(params);
    } catch (error) {
      console.error('Error searching messages for admin:', error);
      return [];
    }
  },

  // Close database connection (handled by backend)
  close: async (): Promise<void> => {
    console.log('Database connection closed (handled by backend)');
  }
};

// Export the database operations as default
export default dbOperations;