import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { useNotification } from '../../contexts/NotificationContext';
import { getEmailsWithSender } from '../../utils/mockData';
import NotificationPanel from './NotificationPanel';
import { 
  Inbox, 
  Send, 
  Users, 
  Mail,
  UserCheck,
  Archive,
  Star,
  Trash2,
  List,
  Bell,
  BellOff,
  BarChart3,
  Wifi
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onCompose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, onCompose }) => {
  const { user, permissions } = useAuth();
  const socket = useSocket();
  const { showBrowserNotification, settings } = useNotification();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  // Load unread email count
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (user?.id) {
        try {
          const emails = await getEmailsWithSender(user.id);
          // Filter emails where user is recipient and email is unread
          const unreadEmails = emails.filter(email => 
            email.recipientIds.includes(user.id) && !email.isRead
          );
          setUnreadCount(unreadEmails.length);
        } catch (error) {
          console.error('Error loading unread count:', error);
        }
      }
    };

    loadUnreadCount();

    // Listen for email read events to update count in real-time
    const handleEmailRead = () => {
      loadUnreadCount();
    };

    window.addEventListener('emailRead', handleEmailRead);
    
    // Refresh count every 30 seconds to catch new emails
    const interval = setInterval(loadUnreadCount, 30000);

    return () => {
      window.removeEventListener('emailRead', handleEmailRead);
      clearInterval(interval);
    };
  }, [user?.id]);

  // Socket.IO real-time email notifications
  useEffect(() => {
    if (socket && user?.id) {
      const handleNewEmail = (emailData: any) => {
        // Update unread count
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification if enabled
        if (settings.browserNotifications) {
          showBrowserNotification(
            'New Email Received',
            `From: ${emailData.senderName}\nSubject: ${emailData.subject}`,
            '/favicon.ico'
          );
        }
      };

      socket.on('new-email', handleNewEmail);

      return () => {
        socket.off('new-email', handleNewEmail);
      };
    }
  }, [socket, user?.id, settings.browserNotifications, showBrowserNotification]);

  const navigationItems = [
    {
      id: 'inbox',
      label: 'Inbox',
      icon: Inbox,
      show: true,
      count: unreadCount, // Use dynamic unread count
    },
    {
      id: 'compose',
      label: 'Compose',
      icon: Mail,
      show: permissions.canComposeEmails,
      count: 0,
    },
    {
      id: 'starred',
      label: 'Starred',
      icon: Star,
      show: true,
      count: 0,
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      show: true,
      count: 0,
    },
    {
      id: 'trash',
      label: 'Trash',
      icon: Trash2,
      show: true,
      count: 0,
    },
  ];

  // Admin/Manager/Team Leader/BDE specific menu items
  const adminMenuItems = [
    ...(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'team-leader' || user?.role === 'bde' ? [
      { id: 'sent-emails', label: 'Sent Emails', icon: Send },
    ] : []),
    ...(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'team-leader' ? [
      { id: 'distribution-lists', label: 'Distribution Lists', icon: List },
    ] : []),
    ...(user?.role === 'admin' || user?.role === 'manager' ? [
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'live-queue', label: 'Live Queue', icon: Wifi },
    ] : []),
    ...(user?.role === 'admin' ? [
      { id: 'user-management', label: 'User Management', icon: Users },
      { id: 'message-log', label: 'Message Log', icon: Mail },
    ] : []),
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Ketto Email</h1>
            <p className="text-xs text-gray-500 capitalize">{user?.role} Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems
          .filter(item => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'compose' && onCompose) {
                    onCompose();
                  } else {
                    onViewChange(item.id);
                  }
                }}
                className={`sidebar-item w-full ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4 mr-3" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.count > 0 && (
                  <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

        {/* Admin/Manager Section */}
        {adminMenuItems.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Management
              </h3>
            </div>
            {adminMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  console.log('Sidebar navigation clicked:', item.id);
                  onViewChange(item.id);
                }}
                className={`sidebar-item w-full ${
                  activeView === item.id ? 'active' : ''
                }`}
              >
                <item.icon className="w-4 h-4 mr-3" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            ))}
          </>
        )}
      </nav>

      {/* User Info Section */}
      <div className="p-4 border-t border-gray-200">
        {/* Notification Settings Button */}
        <div className="mb-4">
          <button
            onClick={() => setShowNotificationPanel(true)}
            className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {settings.browserNotifications ? (
              <Bell className="w-4 h-4 text-blue-600" />
            ) : (
              <BellOff className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm text-gray-700">Notification Settings</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        
        {/* Role Badge */}
        <div className="mt-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user?.role === 'admin' 
              ? 'bg-red-100 text-red-800'
              : user?.role === 'manager'
              ? 'bg-blue-100 text-blue-800'
              : user?.role === 'bde'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {user?.role?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Notification Panel */}
      <NotificationPanel 
        isOpen={showNotificationPanel}
        onClose={() => setShowNotificationPanel(false)}
      />
    </div>
  );
};

export default Sidebar;