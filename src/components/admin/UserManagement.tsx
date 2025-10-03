import React, { useState, useEffect } from 'react';
import { User, UserPermissions } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import dbOperations from '../../utils/database';
import { Plus, Edit, Trash2, Search, Filter, UserCheck, UserX, Eye, EyeOff, Upload, Key, Paperclip } from 'lucide-react';
import BulkUserUpload from './BulkUserUpload';

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'manager' | 'team-leader' | 'agent' | 'bde';
  department: string;
  status: 'active' | 'inactive';
}

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'agent',
    department: '',
    status: 'active'
  });

  // Load users from database on component mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const storedUsers = await dbOperations.getUsers();
        setUsers(storedUsers);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    
    loadUsers();
  }, []);

  // Check permissions - Only admins can manage users now
  const canManageUsers = user?.role === 'admin';
  const canDeleteUsers = user?.role === 'admin';

  // Filter users based on search and filters
  const filteredUsers = users.filter(u => {
    const fullName = `${u.firstName} ${u.lastName}`;
    const matchesSearch = searchQuery === '' || 
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && u.isActive) ||
      (statusFilter === 'inactive' && !u.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleAddUser = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: 'agent',
      department: '',
      status: 'active'
    });
    setEditingUser(null);
    setShowAddModal(true);
  };

  const handleEditUser = (userToEdit: User) => {
    setFormData({
      firstName: userToEdit.firstName,
      lastName: userToEdit.lastName,
      email: userToEdit.email,
      role: userToEdit.role,
      department: userToEdit.department || '',
      status: userToEdit.isActive ? 'active' : 'inactive'
    });
    setEditingUser(userToEdit);
    setShowAddModal(true);
  };

  const handleSaveUser = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (editingUser) {
        // Update existing user
        const updatedUser = { 
          ...editingUser, 
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          isActive: formData.status === 'active',
          updatedAt: new Date() 
        };
        setUsers(users.map(u => 
          u.id === editingUser.id ? updatedUser : u
        ));
        // Persist to database
        await dbOperations.updateUser(updatedUser);
      } else {
        // Add new user
        const newUser: User = {
          id: `user-${Date.now()}`,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          password: 'temp123', // Default password for new users
          isActive: formData.status === 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setUsers([...users, newUser]);
        
        // Persist to database
        await dbOperations.addUser(newUser);
      }

      setShowAddModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user. Please try again.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) {
      alert('You cannot delete your own account');
      return;
    }

    if (confirm('Are you sure you want to delete this user?')) {
      try {
        setUsers(users.filter(u => u.id !== userId));
        // Persist to database
        await dbOperations.deleteUser(userId);
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user. Please try again.');
      }
    }
  };

  const handleToggleStatus = async (userId: string) => {
    if (userId === user?.id) {
      alert('You cannot deactivate your own account');
      return;
    }

    try {
      const updatedUsers = users.map(u => 
        u.id === userId 
          ? { ...u, isActive: !u.isActive, updatedAt: new Date() }
          : u
      );
      setUsers(updatedUsers);
      
      // Persist to database
      const updatedUser = updatedUsers.find(u => u.id === userId);
      if (updatedUser) {
        await dbOperations.updateUser(updatedUser);
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status. Please try again.');
    }
  };

  const handleResetPassword = async (userId: string, userEmail: string) => {
    if (confirm(`Are you sure you want to reset the password for ${userEmail}? The user will receive a temporary password: temp123`)) {
      try {
        // Check if current user is admin (should be since they're in admin panel)
        if (user?.role !== 'admin') {
          alert('Only administrators can reset passwords');
          return;
        }

        // Call the reset password API
        const result = await dbOperations.resetPassword(userId, user.id);
        
        if (result.temporaryPassword === 'temp123') {
          alert(`Password reset successfully for ${userEmail}. Temporary password: temp123\n\nThe user should change this password on their next login.`);
        } else {
          alert(`Password reset successfully for ${userEmail}.`);
        }
      } catch (error) {
        console.error('Error resetting password:', error);
        alert(`Failed to reset password for ${userEmail}. Please try again.`);
      }
    }
  };

  const handleToggleAttachmentPermission = async (userId: string, userEmail: string, currentStatus: boolean) => {
    if (user?.role !== 'admin') {
      alert('Only administrators can modify attachment permissions');
      return;
    }

    // Allow toggling for admin, manager, team-leader, and bde roles
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser || (targetUser.role !== 'admin' && targetUser.role !== 'manager' && targetUser.role !== 'team-leader' && targetUser.role !== 'bde')) {
      alert('Attachment permissions can only be modified for Admin, Manager, Team Leader, and BDE roles');
      return;
    }

    const action = currentStatus ? 'disable' : 'enable';
    if (confirm(`Are you sure you want to ${action} attachment permissions for ${userEmail}?`)) {
      try {
        const result = await dbOperations.updateAttachmentPermission(userId, !currentStatus, user.id);
        
        // Update local state
        setUsers(users.map(u => 
          u.id === userId 
            ? { ...u, canSendAttachments: result.canSendAttachments, updatedAt: new Date() }
            : u
        ));
        alert(`Attachment permissions ${action}d successfully for ${userEmail}`);
      } catch (error) {
        console.error(`Error ${action}ing attachment permission:`, error);
        alert(`Failed to ${action} attachment permissions. Please try again.`);
      }
    }
  };

  const handleBulkUsersCreated = async (newUsers: User[]) => {
    // Check for duplicate emails
    const existingEmails = new Set(users.map(u => u.email.toLowerCase()));
    const validUsers = newUsers.filter(newUser => {
      if (existingEmails.has(newUser.email.toLowerCase())) {
        console.warn(`User with email ${newUser.email} already exists, skipping...`);
        return false;
      }
      return true;
    });

    if (validUsers.length > 0) {
      try {
        // Update local state
        setUsers(prevUsers => [...prevUsers, ...validUsers]);
        
        // Persist to database
        for (const user of validUsers) {
          await dbOperations.addUser(user);
        }
        
        alert(`Successfully created ${validUsers.length} users!`);
      } catch (error) {
        console.error('Error creating bulk users:', error);
        alert('Failed to create some users. Please try again.');
      }
    }

    if (validUsers.length < newUsers.length) {
      alert(`${newUsers.length - validUsers.length} users were skipped due to duplicate emails.`);
    }
  };

  if (!canManageUsers) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Access denied. You don't have permission to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage users and their permissions</p>
          </div>
          <div className="flex space-x-3">
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowBulkUpload(true)}
                className="btn-secondary"
              >
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </button>
            )}
            <button
              onClick={handleAddUser}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-field"
            />
          </div>

          {/* Role Filter */}
          <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="input-field w-40"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="team-leader">Team Leader</option>
                    <option value="agent">Agent</option>
                  </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-40"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="bg-white">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attachments
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium">
                          {`${u.firstName} ${u.lastName}`.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {u.firstName} {u.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      u.role === 'admin' 
                        ? 'bg-red-100 text-red-800'
                        : u.role === 'manager'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{u.department}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        u.isActive ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                      <span className={`text-sm ${
                        u.isActive ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {(u.role === 'manager' || u.role === 'team-leader') ? (
                        <button
                          onClick={() => handleToggleAttachmentPermission(u.id, u.email, u.canSendAttachments || false)}
                          className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                            u.canSendAttachments
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          } transition-colors`}
                          title={u.canSendAttachments ? 'Can send attachments' : 'Cannot send attachments'}
                        >
                          <Paperclip className="w-2 h-2 mr-1" />
                      {u.canSendAttachments ? 'Enabled' : 'Disabled'}
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                          <Paperclip className="w-3 h-3 mr-1" />
                          N/A
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditUser(u)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Edit user"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        className={`p-1 ${
                          u.isActive 
                            ? 'text-red-600 hover:text-red-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                        title={u.isActive ? 'Deactivate user' : 'Activate user'}
                        disabled={u.id === user?.id}
                      >
                        {u.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleResetPassword(u.id, u.email)}
                        className="text-orange-600 hover:text-orange-900 p-1"
                        title="Reset password"
                        disabled={u.id === user?.id}
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      {canDeleteUsers && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete user"
                          disabled={u.id === user?.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <UserX className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="input-field"
                    placeholder="Enter first name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="input-field"
                    placeholder="Enter last name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="input-field"
                    placeholder="Enter department"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="input-field"
                  >
                    <option value="agent">Agent</option>
                    <option value="team-leader">Team Leader</option>
                    <option value="manager">Manager</option>
                    <option value="bde">BDE</option>
                    {user?.role === 'admin' && <option value="admin">Admin</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="input-field"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUser}
                  className="btn-primary"
                >
                  {editingUser ? 'Update' : 'Create'} User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <BulkUserUpload
          onUsersCreated={handleBulkUsersCreated}
          onClose={() => setShowBulkUpload(false)}
        />
      )}
    </div>
  );
};

export default UserManagement;