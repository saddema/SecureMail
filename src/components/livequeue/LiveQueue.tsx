import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dbOperations } from '../../utils/database';
import { Wifi, Users, Clock, RefreshCw, User, Mail, Building, Shield } from 'lucide-react';

interface ActiveSession {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  userDepartment: string;
  loginTime: string;
  lastActivity: string;
  isActive: boolean;
}

const LiveQueue: React.FC = () => {
  const { user } = useAuth();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [hasPermission, setHasPermission] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const loadActiveSessions = async () => {
    try {
      if (user?.id) {
        console.log('Loading active sessions for user:', user.id);
        const sessions = await dbOperations.getActiveSessions(user.id);
        console.log('Received sessions:', sessions);
        setActiveSessions(sessions);
        applyFilters(sessions);
        setLastUpdated(new Date());
        setHasPermission(true);
      }
    } catch (error: any) {
      console.error('Error loading active sessions:', error);
      // If user doesn't have permission, show empty state instead of error
      if (error.message?.includes('403') || error.message?.includes('Only administrators') || error.message?.includes('Admin user not found')) {
        console.log('User does not have permission to view active sessions');
        setActiveSessions([]);
        setFilteredSessions([]);
        setHasPermission(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveSessions();
    
    if (autoRefresh) {
      const interval = setInterval(loadActiveSessions, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id, autoRefresh]);

  useEffect(() => {
    applyFilters(activeSessions);
  }, [departmentFilter, roleFilter, activeSessions]);

  const handleManualRefresh = () => {
    setLoading(true);
    loadActiveSessions();
  };

  const applyFilters = (sessions: ActiveSession[]) => {
    let filtered = sessions;
    
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(session => session.userDepartment === departmentFilter);
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(session => session.userRole === roleFilter);
    }
    
    setFilteredSessions(filtered);
  };

  const getUniqueDepartments = () => {
    const departments = new Set(activeSessions.map(session => session.userDepartment));
    return Array.from(departments).sort();
  };

  const getUniqueRoles = () => {
    const roles = new Set(activeSessions.map(session => session.userRole));
    return Array.from(roles).sort();
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'team-leader':
        return 'bg-purple-100 text-purple-800';
      case 'agent':
        return 'bg-green-100 text-green-800';
      case 'user':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (loginTime: string) => {
    const login = new Date(loginTime);
    const now = new Date();
    const diffMs = now.getTime() - login.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  const getSessionStatus = (lastActivity: string) => {
    const lastActive = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins > 25) {
      return { status: 'stale', color: 'text-red-600', label: 'Stale' };
    } else if (diffMins > 15) {
      return { status: 'warning', color: 'text-yellow-600', label: 'Inactive' };
    } else {
      return { status: 'active', color: 'text-green-600', label: 'Active' };
    }
  };

  if (loading && activeSessions.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Wifi className="w-6 h-6 mr-3 text-green-500" />
            Live Queue
          </h1>
          <p className="text-gray-600 mt-1">Real-time monitoring of active user sessions</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleManualRefresh}
            className="btn-primary flex items-center space-x-2"
            disabled={loading || !hasPermission}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh && hasPermission}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
              disabled={!hasPermission}
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{filteredSessions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Departments</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(filteredSessions.map(s => s.userDepartment)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">User Roles</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(filteredSessions.map(s => s.userRole)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-gray-600" />
                Active Sessions 
                <span className="ml-2 bg-gray-100 text-gray-800 text-sm font-medium px-2 py-1 rounded-full">
                  {filteredSessions.length}
                </span>
              </h2>
              
              {/* Filters next to title */}
              {hasPermission && activeSessions.length > 0 && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Department:</label>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="all">All</option>
                      {getUniqueDepartments().map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Role:</label>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="all">All</option>
                      {getUniqueRoles().map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                  
                  {(departmentFilter !== 'all' || roleFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setDepartmentFilter('all');
                        setRoleFilter('all');
                      }}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded border border-primary-200 hover:border-primary-300 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-1" />
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Updating...'}
            </div>
          </div>
          
          {/* Filter results count */}
          {(departmentFilter !== 'all' || roleFilter !== 'all') && hasPermission && activeSessions.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-gray-600">
                Showing {filteredSessions.length} of {activeSessions.length} sessions
              </p>
            </div>
          )}
        </div>

        <div className="p-6">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {hasPermission ? 'No Active Users' : 'Access Denied'}
              </h3>
              <p className="text-gray-500">
                {hasPermission 
                  ? 'There are currently no active user sessions.' 
                  : 'You do not have permission to view active user sessions. Only administrators and managers can access this feature.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-sm font-semibold text-gray-900">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        User
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Department
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Session Duration
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Last Activity
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Login Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredSessions.map((session) => {
                    const sessionStatus = getSessionStatus(session.lastActivity);
                    return (
                    <tr key={session.userId} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-3 ${sessionStatus.status === 'active' ? 'bg-green-500 animate-pulse' : sessionStatus.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{session.userName}</div>
                            <div className={`text-xs ${sessionStatus.color}`}>{sessionStatus.label}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-gray-900">{session.userEmail}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-gray-900">{session.userDepartment}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex text-xs px-2 py-1 rounded-full font-medium ${getRoleColor(session.userRole)}`}>
                          {session.userRole}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">{formatDuration(session.loginTime)}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-gray-900">{new Date(session.lastActivity).toLocaleTimeString()}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-gray-900">{new Date(session.loginTime).toLocaleString()}</div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveQueue;