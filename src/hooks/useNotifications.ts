import { useEffect, useState } from 'react';
import { notificationService, NotificationData } from '../utils/notificationService';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const checkSupport = () => {
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(notificationService.getPermissionStatus());
      }
    };

    checkSupport();
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    try {
      const result = await notificationService.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const showNotification = async (data: NotificationData): Promise<void> => {
    if (permission !== 'granted') {
      console.warn('Cannot show notification: permission not granted');
      return;
    }

    try {
      await notificationService.showNotification(data);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  const showEmailNotification = async (emailData: {
    subject: string;
    senderName: string;
    senderEmail: string;
    priority: 'high' | 'normal' | 'low';
    bodyPreview: string;
    emailId: string;
  }): Promise<void> => {
    if (permission !== 'granted') {
      console.warn('Cannot show email notification: permission not granted');
      return;
    }

    try {
      await notificationService.showEmailNotification(emailData);
    } catch (error) {
      console.error('Error showing email notification:', error);
    }
  };

  const showReadReceiptNotification = async (readData: {
    emailSubject: string;
    readerName: string;
    readAt: string;
    emailId: string;
  }): Promise<void> => {
    if (permission !== 'granted') {
      console.warn('Cannot show read receipt notification: permission not granted');
      return;
    }

    try {
      await notificationService.showReadReceiptNotification(readData);
    } catch (error) {
      console.error('Error showing read receipt notification:', error);
    }
  };

  const showArchiveNotification = async (archiveData: {
    action: 'archived' | 'unarchived';
    emailSubject: string;
    emailId: string;
  }): Promise<void> => {
    if (permission !== 'granted') {
      console.warn('Cannot show archive notification: permission not granted');
      return;
    }

    try {
      await notificationService.showArchiveNotification(archiveData);
    } catch (error) {
      console.error('Error showing archive notification:', error);
    }
  };

  const subscribeToPush = async (): Promise<boolean> => {
    if (permission !== 'granted') {
      console.warn('Cannot subscribe to push: permission not granted');
      return false;
    }

    try {
      const subscription = await notificationService.subscribeToPush();
      return subscription !== null;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    showEmailNotification,
    showReadReceiptNotification,
    showArchiveNotification,
    subscribeToPush,
    isPermissionGranted: permission === 'granted'
  };
};