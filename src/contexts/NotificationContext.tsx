import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface NotificationSettings {
  browserNotifications: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
}

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  showBrowserNotification: (title: string, body: string, icon?: string) => void;
  requestPermission: () => Promise<boolean>;
  hasPermission: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    browserNotifications: true,
    emailNotifications: true,
    soundEnabled: true
  });

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  // Load user notification settings
  useEffect(() => {
    if (user?.id) {
      const savedSettings = localStorage.getItem(`notification-settings-${user.id}`);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    }
  }, [user?.id]);

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setHasPermission(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      return granted;
    }

    return false;
  };

  const showBrowserNotification = (title: string, body: string, icon?: string) => {
    if (!settings.browserNotifications || !hasPermission) {
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'email-notification',
      requireInteraction: false,
      silent: !settings.soundEnabled
    });

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    // Handle click to focus window
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    if (user?.id) {
      localStorage.setItem(`notification-settings-${user.id}`, JSON.stringify(updatedSettings));
    }
  };

  const value: NotificationContextType = {
    settings,
    updateSettings,
    showBrowserNotification,
    requestPermission,
    hasPermission
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};