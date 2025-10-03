import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DistributionList, DistributionListMember, CSVParseResult, User } from '../../types';
import { CSVParser } from '../../utils/csvParser';
import { DistributionListService } from '../../utils/distributionListService';
import { getUsers } from '../../utils/mockData';
import {
  Upload,
  Plus,
  Edit,
  Trash2,
  Users,
  Download,
  AlertCircle,
  CheckCircle,
  X,
  Search,
  FileText
} from 'lucide-react';

const DistributionListManagement: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [editingList, setEditingList] = useState<DistributionList | null>(null);
  const [selectedList, setSelectedList] = useState<DistributionList | null>(null);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const [memberFormData, setMemberFormData] = useState({
    name: '',
    email: ''
  });

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [emailSuggestions, setEmailSuggestions] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadDistributionLists();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const users = await getUsers();
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadDistributionLists = async () => {
    try {
      const distributionLists = await DistributionListService.getAllLists();
      setLists(distributionLists);
      setError(null);
    } catch (error) {
      console.error('DistributionListManagement: Error loading distribution lists:', error);
      setError('Failed to load distribution lists');
    }
  };

  const handleCreateList = async () => {
    if (!formData.name.trim()) return;
    
    setLoading(true);
    try {
      let members = [];
      
      // If we have parse results from CSV upload, use those members
      if (parseResult && parseResult.validMembers) {
        members = parseResult.validMembers;
      }
      
      const newList = await DistributionListService.createList({
        name: formData.name,
        description: formData.description,
        members: members,
        createdBy: user?.id || 'unknown'
      });
      
      setLists(prev => [...prev, newList]);
      
      // Close the appropriate modal
      if (showUploadModal) {
        setShowUploadModal(false);
      } else {
        setShowCreateModal(false);
        setEditingList(null);
      }
      
      resetForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create list';
      if (showUploadModal) {
        setUploadError(errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateList = async () => {
    if (!editingList || !formData.name.trim()) return;
    
    setLoading(true);
    try {
      const updatedList = await DistributionListService.updateList(editingList.id, {
        name: formData.name,
        description: formData.description
      });
      
      setLists(prev => prev.map(list => 
        list.id === editingList.id ? updatedList : list
      ));
      setShowCreateModal(false);
      setEditingList(null);
      setFormData({ name: '', description: '' });
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update list');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setUploadError('Please select a valid CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      const parseResult = CSVParser.parseCSV(csvContent);
      
      // Add filename to parse result
      const resultWithFileName = {
        ...parseResult,
        fileName: file.name
      };
      
      setParseResult(resultWithFileName);
      setUploadError(parseResult.error || null);
      
      // Don't automatically show modal - user is already in the modal
      if (!parseResult.success && parseResult.error) {
        setUploadError(parseResult.error);
      }
    };
    
    reader.onerror = () => {
      setUploadError('Error reading file');
    };
    
    reader.readAsText(file);
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this distribution list?')) return;
    
    try {
      await DistributionListService.deleteList(listId);
      setLists(prev => prev.filter(list => list.id !== listId));
      setError(null);
    } catch (error) {
      console.error('Error deleting list:', error);
      setError('Failed to delete distribution list');
    }
  };

  const startEdit = (list: DistributionList) => {
    setEditingList(list);
    setFormData({ name: list.name, description: list.description || '' });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setParseResult(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    // Generate CSV template with actual user data from the system
    const headers = ['List Name', 'Role', 'Designation', 'Email Address', 'Status'];
    
    // Use actual users from the system
    const userData = allUsers.map(user => [
      formData.name,
      user.role.charAt(0).toUpperCase() + user.role.slice(1), // Capitalize role
      user.role.charAt(0).toUpperCase() + user.role.slice(1), // Use role as designation
      user.email,
      user.isActive ? 'Active' : 'Inactive' // Use isActive property
    ]);

    const csvContent = [
      headers.join(','),
      ...userData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.name.replace(/[^a-zA-Z0-9]/g, '_')}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAddMember = async () => {
    if (!selectedList || !memberFormData.email.trim()) return;
    
    setLoading(true);
    try {
      const newMember: DistributionListMember = {
        email: memberFormData.email.toLowerCase(),
        name: memberFormData.name.trim() || undefined
      };
      
      const updatedList = await DistributionListService.addMember(selectedList.id, newMember);
      setLists(prev => prev.map(list => 
        list.id === selectedList.id ? updatedList : list
      ));
      setSelectedList(updatedList);
      setMemberFormData({ name: '', email: '' });
      setShowAddMemberModal(false);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedList) return;
    
    try {
      const updatedList = await DistributionListService.removeMember(selectedList.id, memberId);
      setLists(prev => prev.map(list => 
        list.id === selectedList.id ? updatedList : list
      ));
      setSelectedList(updatedList);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove member');
    }
  };

  const handleEmailInputChange = (value: string) => {
    setMemberFormData(prev => ({ ...prev, email: value }));
    
    if (value.length > 0) {
      const suggestions = allUsers.filter(user => 
        user.email.toLowerCase().includes(value.toLowerCase()) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setEmailSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (user: User) => {
    setMemberFormData({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`
    });
    setShowSuggestions(false);
  };

  const filteredLists = lists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Distribution Lists</h1>
          <p className="text-gray-600">Manage email distribution lists for your organization</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-secondary flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create List
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search distribution lists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-field"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  List Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Members
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLists.map((list) => (
                <tr key={list.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{list.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {list.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{list.members.length}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(list.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedList(list);
                          setShowMembersModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Members"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startEdit(list)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteList(list.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLists.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No distribution lists</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new distribution list.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Upload CSV Distribution List</h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {uploadError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <span className="text-red-700">{uploadError}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">List Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="Enter list name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field"
                  rows={3}
                  placeholder="Enter description..."
                />
              </div>

              {/* Template Download Section - Only show when name is filled */}
              {formData.name.trim() && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Step 1: Download Template</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Download the CSV template with user data. You can remove any email addresses you don't want to include.
                  </p>
                  <button
                    onClick={handleDownloadTemplate}
                    className="btn-primary flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV Template
                  </button>
                </div>
              )}

              {/* File Upload Section - Only show after template download */}
              {formData.name.trim() && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Step 2: Upload Modified CSV</h4>
                  <p className="text-sm text-green-700 mb-3">
                    Upload your modified CSV file to create the distribution list.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  {parseResult?.fileName && (
                    <div className="mt-2 text-sm text-green-600">
                      File selected: {parseResult.fileName}
                    </div>
                  )}
                </div>
              )}

              {parseResult && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Parse Results</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <span>Valid members: {parseResult.validMembers.length}</span>
                    </div>
                    <div className="flex items-center">
                      <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                      <span>Invalid rows: {parseResult.invalidRows.length}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-600">Total rows: {parseResult.totalRows}</span>
                    </div>
                  </div>
                  
                  {parseResult.invalidRows.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-red-700 mb-2">Invalid Rows:</h5>
                      <div className="max-h-32 overflow-y-auto no-scrollbar">
                        {parseResult.invalidRows.slice(0, 5).map((invalidRow, index) => (
                          <div key={index} className="text-xs text-red-600 mb-1">
                            Row {invalidRow.row}: {invalidRow.errors.join(', ')}
                          </div>
                        ))}
                        {parseResult.invalidRows.length > 5 && (
                          <div className="text-xs text-red-600">
                            ... and {parseResult.invalidRows.length - 5} more errors
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetForm();
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateList}
                disabled={loading || !formData.name.trim() || (showUploadModal && (!parseResult || parseResult.validMembers.length === 0))}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create List'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingList ? 'Edit Distribution List' : 'Create Distribution List'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingList(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">List Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="Enter list name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field"
                  rows={3}
                  placeholder="Enter description..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingList(null);
                  resetForm();
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={editingList ? handleUpdateList : handleCreateList}
                disabled={loading || !formData.name.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (editingList ? 'Updating...' : 'Creating...') : (editingList ? 'Update List' : 'Create List')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Members - {selectedList.name}</h3>
                  <p className="text-sm text-gray-600">{selectedList.members.length} members</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="btn-primary flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                  </button>
                  <button
                    onClick={() => {
                      setShowMembersModal(false);
                      setSelectedList(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedList.members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {member.name || 'No name'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleRemoveMember(member.id!)}
                            className="text-red-600 hover:text-red-900"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {selectedList.members.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No members</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Add members to this distribution list.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Add Member</h3>
                <button
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setMemberFormData({ name: '', email: '' });
                    setShowSuggestions(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name (Optional)</label>
                <input
                  type="text"
                  value={memberFormData.name}
                  onChange={(e) => setMemberFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="Enter member name..."
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={memberFormData.email}
                  onChange={(e) => handleEmailInputChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="input-field"
                  placeholder="Enter email address..."
                />
                
                {showSuggestions && emailSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    {emailSuggestions.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => selectSuggestion(user)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setMemberFormData({ name: '', email: '' });
                  setShowSuggestions(false);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={loading || !memberFormData.email.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistributionListManagement;