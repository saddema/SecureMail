import React, { useState } from 'react';
import { Bell, BellOff, Settings, Volume2, VolumeX, Mail, X } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, requestPermission, hasPermission } = useNotification();
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const handleBrowserNotificationToggle = async () => {
    if (!settings.browserNotifications && !hasPermission) {
      setIsRequestingPermission(true);
      const granted = await requestPermission();
      setIsRequestingPermission(false);
      
      if (granted) {
        updateSettings({ browserNotifications: true });
      } else {
        alert('Please enable notifications in your browser settings to receive email alerts.');
      }
    } else {
      updateSettings({ browserNotifications: !settings.browserNotifications });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="w-4 h-4 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings */}
        <div className="p-6 space-y-6">
          {/* Browser Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {settings.browserNotifications ? (
                <Bell className="w-4 h-4 text-blue-600" />
              ) : (
                <BellOff className="w-4 h-4 text-gray-400" />
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-900">Browser Notifications</h3>
                <p className="text-xs text-gray-500">Get notified when you receive new emails</p>
              </div>
            </div>
            <button
              onClick={handleBrowserNotificationToggle}
              disabled={isRequestingPermission}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                settings.browserNotifications ? 'bg-blue-600' : 'bg-gray-200'
              } ${isRequestingPermission ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.browserNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Permission Status */}
          {!hasPermission && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Browser notifications are blocked. Click the toggle above to enable them.
                </p>
              </div>
            </div>
          )}

          {/* Sound Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {settings.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-green-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-gray-400" />
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-900">Sound Alerts</h3>
                <p className="text-xs text-gray-500">Play sound with notifications</p>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                settings.soundEnabled ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-purple-600" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                <p className="text-xs text-gray-500">Receive email alerts for important messages</p>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ emailNotifications: !settings.emailNotifications })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                settings.emailNotifications ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-500 text-center">
            Changes are saved automatically. You can modify these settings anytime.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;