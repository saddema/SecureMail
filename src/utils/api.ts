// API client for communicating with the backend server
import axios from 'axios';
import { User, Email, EmailRead } from '../types';
export const API_BASE_URL = 'http://localhost:5050/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const apiClient = {
  // User operations
  async getUsers(): Promise<User[]> {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  async getUserById(id: string): Promise<User | null> {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  async addUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const response = await api.post('/users', userData);
      return response.data;
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  },

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  async deleteUser(id: string): Promise<void> {
    try {
      await api.delete(`/users/${id}`);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // Password operations
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      await api.put(`/users/${userId}/password`, {
        currentPassword,
        newPassword
      });
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },

  async resetPassword(userId: string, adminUserId: string): Promise<{ message: string; temporaryPassword: string }> {
    try {
      const response = await api.put(`/users/${userId}/reset-password`, {
        adminUserId
      });
      return response.data;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  },

  // Attachment permission operations
  async getAttachmentPermission(userId: string): Promise<{ canSendAttachments: boolean; userId: string; userName: string; userEmail: string; userRole: string }> {
    try {
      const response = await api.get(`/users/${userId}/attachment-permission`);
      return response.data;
    } catch (error) {
      console.error('Error getting attachment permission:', error);
      throw error;
    }
  },

  async updateAttachmentPermission(userId: string, canSendAttachments: boolean, adminUserId: string): Promise<{ message: string; canSendAttachments: boolean; userId: string; userName: string; userEmail: string; userRole: string }> {
    try {
      const response = await api.put(`/users/${userId}/attachment-permission`, {
        canSendAttachments,
        adminUserId
      });
      return response.data;
    } catch (error) {
      console.error('Error updating attachment permission:', error);
      throw error;
    }
  },

  // Email operations
  async getEmails(userId?: string, archived?: boolean): Promise<Email[]> {
    try {
      let url = '/emails';
      const params = new URLSearchParams();
      
      if (userId) {
        params.append('userId', userId);
      }
      
      if (archived !== undefined) {
        params.append('archived', archived.toString());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      return response.data.map((email: any) => ({
        ...email,
        sentAt: new Date(email.sentAt),
        createdAt: new Date(email.createdAt)
      }));
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  },

  async getSentEmails(userId: string): Promise<Email[]> {
    try {
      const response = await api.get(`/emails/sent?userId=${userId}`);
      return response.data.map((email: any) => ({
        ...email,
        sentAt: new Date(email.sentAt),
        createdAt: new Date(email.createdAt)
      }));
    } catch (error) {
      console.error('Error fetching sent emails:', error);
      throw error;
    }
  },

  async addEmail(emailData: Omit<Email, 'id' | 'sentAt' | 'createdAt'>): Promise<Email> {
    try {
      const response = await api.post('/emails', emailData);
      return {
        ...response.data,
        sentAt: new Date(response.data.sentAt),
        createdAt: new Date(response.data.createdAt)
      };
    } catch (error) {
      console.error('Error adding email:', error);
      throw error;
    }
  },

  async deleteEmail(id: string, userId: string): Promise<void> {
    try {
      await api.delete(`/emails/${id}`, {
        data: { userId }
      });
    } catch (error) {
      console.error('Error deleting email:', error);
      throw error;
    }
  },

  // Email archive operations
  async archiveEmail(id: string, userId: string): Promise<void> {
    try {
      await api.post(`/emails/${id}/archive`, {
        userId
      });
    } catch (error) {
      console.error('Error archiving email:', error);
      throw error;
    }
  },

  async unarchiveEmail(id: string, userId: string): Promise<void> {
    try {
      await api.delete(`/emails/${id}/archive`, {
        data: { userId }
      });
    } catch (error) {
      console.error('Error unarchiving email:', error);
      throw error;
    }
  },

  async bulkArchiveEmails(emailIds: string[], userId: string): Promise<void> {
    try {
      await api.post('/emails/bulk-archive', {
        emailIds,
        userId
      });
    } catch (error) {
      console.error('Error bulk archiving emails:', error);
      throw error;
    }
  },

  // Email read operations
  async getEmailReads(): Promise<EmailRead[]> {
    try {
      const response = await api.get('/email-reads');
      return response.data.map((read: any) => ({
        ...read,
        readAt: new Date(read.readAt),
        createdAt: new Date(read.createdAt)
      }));
    } catch (error) {
      console.error('Error fetching email reads:', error);
      throw error;
    }
  },

  async markEmailAsRead(emailId: string, userId: string): Promise<void> {
    try {
      await api.post('/email-reads', { emailId, userId });
    } catch (error) {
      console.error('Error marking email as read:', error);
      throw error;
    }
  },

  async markEmailAsUnread(emailId: string, userId: string): Promise<void> {
    try {
      await api.delete(`/email-reads/${emailId}/${userId}`);
    } catch (error) {
      console.error('Error marking email as unread:', error);
      throw error;
    }
  },

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await api.get('/health');
      return response.data.status === 'OK';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  },

  // Distribution List operations
  async getDistributionLists(): Promise<any[]> {
    try {
      const response = await api.get('/distribution-lists');
      return response.data;
    } catch (error) {
      console.error('Error fetching distribution lists:', error);
      throw error;
    }
  },

  async getDistributionListById(id: string): Promise<any | null> {
    try {
      const response = await api.get(`/distribution-lists/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching distribution list:', error);
      throw error;
    }
  },

  async createDistributionList(listData: any): Promise<any> {
    try {
      const response = await api.post('/distribution-lists', listData);
      return response.data;
    } catch (error) {
      console.error('Error creating distribution list:', error);
      throw error;
    }
  },

  async updateDistributionList(id: string, listData: any): Promise<any> {
    try {
      const response = await api.put(`/distribution-lists/${id}`, listData);
      return response.data;
    } catch (error) {
      console.error('Error updating distribution list:', error);
      throw error;
    }
  },

  async deleteDistributionList(id: string): Promise<void> {
    try {
      await api.delete(`/distribution-lists/${id}`);
    } catch (error) {
      console.error('Error deleting distribution list:', error);
      throw error;
    }
  },

  // Admin operations for message log
  async getAllEmails(adminUserId?: string): Promise<Email[]> {
    try {
      let url = '/admin/emails';
      const params = new URLSearchParams();
      
      if (adminUserId) {
        params.append('adminUserId', adminUserId);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      // Handle both old format (direct array) and new format (with emails property)
      const emails = response.data.emails || response.data;
      return emails.map((email: any) => ({
        ...email,
        sentAt: new Date(email.sentAt),
        createdAt: new Date(email.createdAt)
      }));
    } catch (error) {
      console.error('Error fetching all emails for admin:', error);
      throw error;
    }
  },

  async getEmailDetails(emailId: string): Promise<Email> {
    try {
      const response = await api.get(`/admin/emails/${emailId}`);
      return {
        ...response.data,
        sentAt: new Date(response.data.sentAt),
        createdAt: new Date(response.data.createdAt)
      };
    } catch (error) {
      console.error('Error fetching email details for admin:', error);
      throw error;
    }
  },

  async searchMessages(params: {
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
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
      
      const response = await api.get(`/admin/emails/search?${queryParams.toString()}`);
      return response.data.map((email: any) => ({
        ...email,
        sentAt: new Date(email.sentAt),
        createdAt: new Date(email.createdAt)
      }));
    } catch (error) {
      console.error('Error searching messages for admin:', error);
      throw error;
    }
  },

  // Active Session operations (for live queue)
  async getActiveSessions(adminUserId: string): Promise<any[]> {
    try {
      console.log('API: Getting active sessions for admin:', adminUserId);
      const response = await api.get(`/sessions/active?adminUserId=${adminUserId}`);
      console.log('API: Response status:', response.status);
      console.log('API: Received data:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Error fetching active sessions:', error);
      throw error;
    }
  },

  async createActiveSession(sessionData: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole: string;
    userDepartment?: string;
    socketId?: string;
  }): Promise<any> {
    try {
      const response = await api.post('/sessions/active', sessionData);
      return response.data;
    } catch (error) {
      console.error('Error creating active session:', error);
      throw error;
    }
  },

  async removeActiveSession(userId: string): Promise<void> {
    try {
      await api.delete(`/sessions/active/${userId}`);
    } catch (error) {
      console.error('Error removing active session:', error);
      throw error;
    }
  },

  async updateSessionActivity(userId: string): Promise<any> {
    try {
      const response = await api.put(`/sessions/active/${userId}/activity`);
      return response.data;
    } catch (error) {
      console.error('Error updating session activity:', error);
      throw error;
    }
  },

  // User Activity Report operations
  async getUserLoginHistory(userId: string, startDate?: string, endDate?: string): Promise<any[]> {
    try {
      let url = `/users/${userId}/login-history`;
      const params = new URLSearchParams();
      
      if (startDate) {
        params.append('startDate', startDate);
      }
      
      if (endDate) {
        params.append('endDate', endDate);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      return response.data.map((entry: any) => ({
        ...entry,
        loginTime: new Date(entry.loginTime),
        logoutTime: entry.logoutTime ? new Date(entry.logoutTime) : null,
        entryDate: new Date(entry.entryDate)
      }));
    } catch (error) {
      console.error('Error fetching user login history:', error);
      throw error;
    }
  },



  async createManualLoginEntry(userId: string, loginDate: string, adminUserId: string): Promise<any> {
    try {
      const response = await api.post(`/users/${userId}/login-history`, {
        loginDate,
        adminUserId
      });
      return {
        ...response.data,
        loginEntry: {
          ...response.data.loginEntry,
          loginTime: new Date(response.data.loginEntry.loginTime),
          entryDate: new Date(response.data.loginEntry.entryDate)
        }
      };
    } catch (error) {
      console.error('Error creating manual login entry:', error);
      throw error;
    }
  },

  async deleteLoginHistoryEntry(userId: string, entryId: string, adminUserId: string): Promise<void> {
    try {
      await api.delete(`/users/${userId}/login-history/${entryId}`, {
        data: { adminUserId }
      });
    } catch (error) {
      console.error('Error deleting login history entry:', error);
      throw error;
    }
  },

  // User Activity Report operations
  async getUserActivityReport(userId: string, startDate: string, endDate: string): Promise<any> {
    try {
      const response = await api.post(`/users/${userId}/activity-report`, {
        startDate,
        endDate
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user activity report:', error);
      throw error;
    }
  }
};

export default apiClient;