import { Email } from '../types';

export interface ReadReceipt {
  emailId: string;
  userId: string;
  readAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface EmailReadStatus {
  emailId: string;
  totalRecipients: number;
  readBy: ReadReceipt[];
  deliveredTo: string[];
  isFullyRead: boolean;
  readPercentage: number;
}

class ReadTrackingService {
  private readReceipts: ReadReceipt[] = [];
  private emailReadStatus: Map<string, EmailReadStatus> = new Map();

  constructor() {
    // Load existing read receipts from localStorage
    this.loadFromStorage();
  }

  /**
   * Mark an email as read by a specific user
   */
  markAsRead(emailId: string, userId: string, additionalInfo?: { ipAddress?: string; userAgent?: string }): void {
    // Check if already marked as read
    const existingReceipt = this.readReceipts.find(
      receipt => receipt.emailId === emailId && receipt.userId === userId
    );

    if (existingReceipt) {
      return; // Already marked as read
    }

    // Create new read receipt
    const readReceipt: ReadReceipt = {
      emailId,
      userId,
      readAt: new Date(),
      ipAddress: additionalInfo?.ipAddress || this.getClientIP(),
      userAgent: additionalInfo?.userAgent || navigator.userAgent
    };

    this.readReceipts.push(readReceipt);
    this.updateEmailReadStatus(emailId);
    this.saveToStorage();

    // Trigger read tracking event
    this.triggerReadEvent(readReceipt);
  }

  /**
   * Get read status for a specific email
   */
  getEmailReadStatus(emailId: string): EmailReadStatus | null {
    return this.emailReadStatus.get(emailId) || null;
  }

  /**
   * Get all read receipts for an email
   */
  getReadReceipts(emailId: string): ReadReceipt[] {
    return this.readReceipts.filter(receipt => receipt.emailId === emailId);
  }

  /**
   * Get read receipts for a specific user
   */
  getUserReadReceipts(userId: string): ReadReceipt[] {
    return this.readReceipts.filter(receipt => receipt.userId === userId);
  }

  /**
   * Initialize email tracking when email is sent
   */
  initializeEmailTracking(email: Email, recipients: string[]): void {
    const emailReadStatus: EmailReadStatus = {
      emailId: email.id,
      totalRecipients: recipients.length,
      readBy: [],
      deliveredTo: recipients,
      isFullyRead: false,
      readPercentage: 0
    };

    this.emailReadStatus.set(email.id, emailReadStatus);
    this.saveToStorage();
  }

  /**
   * Update email read status when someone reads it
   */
  private updateEmailReadStatus(emailId: string): void {
    const readReceipts = this.getReadReceipts(emailId);
    const status = this.emailReadStatus.get(emailId);

    if (!status) {
      return;
    }

    status.readBy = readReceipts;
    status.readPercentage = (readReceipts.length / status.totalRecipients) * 100;
    status.isFullyRead = readReceipts.length === status.totalRecipients;

    this.emailReadStatus.set(emailId, status);
  }



  /**
   * Get unread emails for a specific user
   */
  getUnreadEmails(userId: string, allEmails: Email[]): Email[] {
    const userReadReceipts = this.getUserReadReceipts(userId);
    const readEmailIds = new Set(userReadReceipts.map(receipt => receipt.emailId));

    return allEmails.filter(email => 
      email.recipients.includes(userId) && !readEmailIds.has(email.id)
    );
  }

  /**
   * Check if user has read a specific email
   */
  hasUserReadEmail(emailId: string, userId: string): boolean {
    return this.readReceipts.some(
      receipt => receipt.emailId === emailId && receipt.userId === userId
    );
  }



  /**
   * Export read tracking data for reports
   */
  exportReadTrackingData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      readReceipts: this.readReceipts,
      emailReadStatus: Array.from(this.emailReadStatus.entries()).map(([id, status]) => ({
        emailId: id,
        ...status
      })),
      exportedAt: new Date().toISOString()
    };

    if (format === 'csv') {
      return this.convertToCSV(data.readReceipts);
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Clear all read tracking data
   */
  clearAllData(): void {
    this.readReceipts = [];
    this.emailReadStatus.clear();
    this.saveToStorage();
  }

  /**
   * Private helper methods
   */
  private loadFromStorage(): void {
    try {
      const receipts = localStorage.getItem('email_read_receipts');
      const statuses = localStorage.getItem('email_read_statuses');

      if (receipts) {
        this.readReceipts = JSON.parse(receipts).map((receipt: any) => ({
          ...receipt,
          readAt: new Date(receipt.readAt)
        }));
      }

      if (statuses) {
        const statusArray = JSON.parse(statuses);
        statusArray.forEach((item: any) => {
          this.emailReadStatus.set(item.emailId, {
            ...item.status,
            readBy: item.status.readBy.map((receipt: any) => ({
              ...receipt,
              readAt: new Date(receipt.readAt)
            }))
          });
        });
      }
    } catch (error) {
      console.error('Error loading read tracking data from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('email_read_receipts', JSON.stringify(this.readReceipts));
      
      const statusArray = Array.from(this.emailReadStatus.entries()).map(([emailId, status]) => ({
        emailId,
        status
      }));
      localStorage.setItem('email_read_statuses', JSON.stringify(statusArray));
    } catch (error) {
      console.error('Error saving read tracking data to storage:', error);
    }
  }

  private getClientIP(): string {
    // In a real application, this would be handled server-side
    return '127.0.0.1';
  }

  private triggerReadEvent(readReceipt: ReadReceipt): void {
    // Dispatch custom event for real-time updates
    const event = new CustomEvent('emailRead', {
      detail: readReceipt
    });
    window.dispatchEvent(event);

    // In a real application, this would send data to the server
    console.log('Email read event:', readReceipt);
  }

  private calculateAverageReadTime(receipts: ReadReceipt[]): number {
    // Mock calculation - in real app, this would track actual reading time
    return receipts.length > 0 ? Math.random() * 300 + 30 : 0; // 30-330 seconds
  }

  private getDeviceType(userAgent: string): string {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return 'Mobile';
    } else if (/Tablet/.test(userAgent)) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  }

  private calculateReadingSpeed(receipts: ReadReceipt[]): { fast: number; medium: number; slow: number } {
    // Mock calculation based on reading patterns
    const total = receipts.length;
    if (total === 0) return { fast: 0, medium: 0, slow: 0 };

    return {
      fast: Math.floor(total * 0.3),
      medium: Math.floor(total * 0.5),
      slow: Math.floor(total * 0.2)
    };
  }

  private convertToCSV(receipts: ReadReceipt[]): string {
    const headers = ['Email ID', 'User ID', 'Read At', 'IP Address', 'User Agent'];
    const rows = receipts.map(receipt => [
      receipt.emailId,
      receipt.userId,
      receipt.readAt.toISOString(),
      receipt.ipAddress || '',
      receipt.userAgent || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// Create singleton instance
export const readTrackingService = new ReadTrackingService();

// Hook for React components
export const useReadTracking = () => {
  return {
    markAsRead: (emailId: string, userId: string) => readTrackingService.markAsRead(emailId, userId),
    getEmailReadStatus: (emailId: string) => readTrackingService.getEmailReadStatus(emailId),
    hasUserReadEmail: (emailId: string, userId: string) => readTrackingService.hasUserReadEmail(emailId, userId),
    getUnreadEmails: (userId: string, allEmails: Email[]) => readTrackingService.getUnreadEmails(userId, allEmails)
  };
};