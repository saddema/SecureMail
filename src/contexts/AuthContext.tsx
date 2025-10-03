import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, LoginCredentials, UserPermissions } from '../types';
import dbOperations, { initializeDatabase } from '../utils/database';
import { getUserPermissions } from '../utils/mockData';
import { API_BASE_URL } from '../utils/api';

interface AuthContextType {
  user: AuthUser | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  permissions: UserPermissions;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get user permissions based on role
  const permissions = user ? getUserPermissions(user.role) : {
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canComposeEmails: false,
    canViewAllEmails: false,
    canTrackReadStatus: false,
    canReply: false,
    canForward: false,
  };

  useEffect(() => {
    // Initialize database
    initializeDatabase();
    
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('kettoEmailUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('kettoEmailUser');
      }
    }
    setIsLoading(false);
  }, []);

  // Add periodic check to validate user is still active
  useEffect(() => {
    if (!user) return;

    const validateUserStatus = async () => {
      try {
        const currentUser = await dbOperations.getUserById(user.id);
        if (!currentUser || !currentUser.isActive) {
          // User has been deactivated, force logout
          logout();
          alert('Your account has been deactivated. Please contact your administrator.');
        }
      } catch (error) {
        console.error('Error validating user status:', error);
      }
    };

    // Check immediately when component mounts with a user
    validateUserStatus();

    // Set up periodic checking every 30 seconds
    const interval = setInterval(validateUserStatus, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get user from database by email
      const foundUser = await dbOperations.getUserByEmail(credentials.email);
      console.log('Found user:', foundUser);
      
      // Check if user exists, password matches, and user is active
      // Handle both old schema (name/status) and new schema (firstName/lastName/isActive)
      const isActive = foundUser.isActive !== undefined ? foundUser.isActive : foundUser.status === 'active';
      
      if (foundUser && 
          foundUser.password === credentials.password && 
          isActive) {
        
        // Handle both old and new schema for names
        let firstName, lastName;
        if (foundUser.firstName && foundUser.lastName) {
          // New schema
          firstName = foundUser.firstName;
          lastName = foundUser.lastName;
        } else if (foundUser.name) {
          // Old schema - split name
          const nameParts = foundUser.name.split(' ');
          firstName = nameParts[0] || foundUser.name;
          lastName = nameParts.slice(1).join(' ') || '';
        } else {
          firstName = '';
          lastName = '';
        }
        
        const authUser: AuthUser = {
          id: foundUser.id,
          email: foundUser.email,
          firstName,
          lastName,
          role: foundUser.role,
          isActive,
          department: foundUser.department,
        };

        console.log('Creating auth user:', authUser);
        setUser(authUser);
        localStorage.setItem('kettoEmailUser', JSON.stringify(authUser));
        
        // Create active session for live queue
        try {
          await fetch(`${API_BASE_URL}/sessions/active`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: authUser.id,
              userName: `${authUser.firstName} ${authUser.lastName}`.trim(),
              userEmail: authUser.email,
              userRole: authUser.role,
              userDepartment: authUser.department,
            }),
          });
        } catch (sessionError) {
          console.error('Session tracking error:', sessionError);
        }
        
        // Record login history for activity reports
        try {
          await fetch(`${API_BASE_URL}/users/${authUser.id}/login-history`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              loginDate: new Date().toISOString(),
              adminUserId: authUser.id // Self-entry for login
            }),
          });
        } catch (historyError) {
          console.error('Login history tracking error:', historyError);
        }
        
        setIsLoading(false);
        return true;
      }

      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    if (user) {
      // Remove active session for live queue
      try {
        await fetch(`${API_BASE_URL}/sessions/active/${user.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (sessionError) {
        console.error('Session removal error:', sessionError);
      }
    }
    setUser(null);
    localStorage.removeItem('kettoEmailUser');
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    permissions,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};