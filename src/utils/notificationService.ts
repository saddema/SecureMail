// Notification Service for handling push notifications
export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  priority?: 'high' | 'normal' | 'low';
  vibrate?: number[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSupported = 'Notification' in window && 'serviceWorker' in navigator;

  constructor() {
    this.initializeServiceWorker();
  }

  private async initializeServiceWorker(): Promise<void> {
    if (!this.isSupported) {
      console.warn('Push notifications not supported in this browser');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      this.swRegistration = registration;
      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported) {
      return 'denied';
    }
    return Notification.permission;
  }

  isPermissionGranted(): boolean {
    return this.getPermissionStatus() === 'granted';
  }

  async showNotification(data: NotificationData): Promise<void> {
    if (!this.isSupported || !this.isPermissionGranted()) {
      console.warn('Cannot show notification: permission not granted or not supported');
      return;
    }

    try {
      const notificationOptions: NotificationOptions = {
        body: data.body,
        icon: data.icon || '/email-icon.svg',
        badge: data.badge || '/email-badge.svg',
        tag: data.tag || 'email-notification',
        renotify: true,
        data: data.data || {},
        requireInteraction: data.priority === 'high',
        vibrate: data.vibrate || [200, 100, 200],
        silent: false,
        timestamp: Date.now()
      };

      if (data.actions && data.actions.length > 0) {
        notificationOptions.actions = data.actions;
      }

      if (this.swRegistration && this.swRegistration.active) {
        // Use service worker to show notification
        await this.swRegistration.showNotification(data.title, notificationOptions);
      } else {
        // Fallback to regular notification
        new Notification(data.title, notificationOptions);
      }

      console.log('Notification shown successfully:', data.title);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async showEmailNotification(emailData: {
    subject: string;
    senderName: string;
    senderEmail: string;
    priority: 'high' | 'normal' | 'low';
    bodyPreview: string;
    emailId: string;
  }): Promise<void> {
    const priorityIcon = emailData.priority === 'high' ? '🔴' : 
                        emailData.priority === 'low' ? '🟢' : '🔵';

    const notificationData: NotificationData = {
      title: `${priorityIcon} New Email from ${emailData.senderName}`,
      body: `${emailData.subject}\n${emailData.bodyPreview}`,
      icon: '/email-icon.svg',
      badge: '/email-badge.svg',
      tag: `email-${emailData.emailId}`,
      priority: emailData.priority,
      data: {
        emailId: emailData.emailId,
        url: `/email/${emailData.emailId}`,
        type: 'new-email'
      },
      actions: [
        {
          action: 'view',
          title: 'View Email'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      vibrate: emailData.priority === 'high' ? [300, 100, 300, 100, 300] : [200, 100, 200]
    };

    await this.showNotification(notificationData);
  }

  async showReadReceiptNotification(readData: {
    emailSubject: string;
    readerName: string;
    readAt: string;
    emailId: string;
  }): Promise<void> {
    const notificationData: NotificationData = {
      title: '👁️ Email Read',
      body: `${readData.readerName} read your email: "${readData.emailSubject}"`,
      icon: '/read-icon.svg',
      badge: '/read-badge.svg',
      tag: `read-${readData.emailId}`,
      data: {
        emailId: readData.emailId,
        url: `/sent/${readData.emailId}`,
        type: 'email-read'
      },
      actions: [
        {
          action: 'view',
          title: 'View Details'
        }
      ]
    };

    await this.showNotification(notificationData);
  }

  async showArchiveNotification(archiveData: {
    action: 'archived' | 'unarchived';
    emailSubject: string;
    emailId: string;
  }): Promise<void> {
    const actionText = archiveData.action === 'archived' ? '📁 Archived' : '📂 Unarchived';
    
    const notificationData: NotificationData = {
      title: actionText,
      body: `Email "${archiveData.emailSubject}" has been ${archiveData.action}`,
      icon: '/archive-icon.svg',
      badge: '/archive-badge.svg',
      tag: `archive-${archiveData.emailId}`,
      data: {
        emailId: archiveData.emailId,
        url: archiveData.action === 'archived' ? '/archive' : '/inbox',
        type: 'archive-action'
      }
    };

    await this.showNotification(notificationData);
  }

  // Subscribe to push notifications (for future server push implementation)
  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.isSupported || !this.swRegistration || !this.isPermissionGranted()) {
      return null;
    }

    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDkrkrwVBJkk3Xt23V2d6w3pkazZDb4Q8G2QdaWf5Kc'
        )
      });

      console.log('Push subscription successful:', subscription);
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const notificationService = new NotificationService();