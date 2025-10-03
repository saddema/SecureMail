import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ChangePassword from '../auth/ChangePassword';
import { 
  Search, 
  Settings, 
  LogOut, 
  ChevronDown,
  Menu
} from 'lucide-react';

interface TopBarProps {
  onMenuToggle?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeView?: string;
}

const TopBar: React.FC<TopBarProps> = ({ 
  onMenuToggle, 
  searchQuery, 
  onSearchChange,
  activeView 
}) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const handleChangePassword = () => {
    setShowChangePassword(true);
    setShowUserMenu(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <Menu className="w-4 h-4 text-gray-600" />
            </button>
          )}

          {/* Search Bar - Only show for inbox view */}
          {activeView === 'inbox' && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                placeholder="Search emails..."
              />
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
                
                <div className="py-2">
                  <button 
                    onClick={handleChangePassword}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Change Password
                  </button>
                </div>
                
                <div className="border-t border-gray-200 py-2">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}
    </header>
  );
};

export default TopBar;