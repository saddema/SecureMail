import React, { useState, useEffect } from 'react';
import { Email, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { dbOperations } from '../../utils/database';
import { apiClient } from '../../utils/api';
import { Search, Filter, Calendar, User as UserIcon, Mail, Eye, Clock, Download, RefreshCw, ChevronLeft, ChevronRight, Paperclip } from 'lucide-react';

interface MessageLogEntry {
  id: string;
  subject: string;
  body: string;
  sender: User;
  recipients: User[];
  sentAt: Date;
  readBy: { user: User; readAt: Date }[];
  attachments: any[];
  priority?: string;
}

interface MessageLogFilters {
  searchQuery: string;
  senderId: string;
  recipientId: string;
  dateFrom: string;
  dateTo: string;
  hasAttachments: boolean;
  isRead: string;
  priority: string;
}

const MessageLog: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageLogEntry[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<MessageLogEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [selectedMessage, setSelectedMessage] = useState<MessageLogEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<MessageLogFilters>({
    searchQuery: '',
    senderId: '',
    recipientId: '',
    dateFrom: '',
    dateTo: '',
    hasAttachments: false,
    isRead: '',
    priority: ''
  });

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Function to download attachments
  const downloadAttachment = (fileName: string, fileType: string, filename?: string) => {
    if (filename) {
      // Use the new download endpoint with the stored filename and original name
      const downloadUrl = `http://localhost:5050/api/download/${filename}?originalName=${encodeURIComponent(fileName)}`;
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName; // Use original filename for download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Fallback for old data without filename
      alert(`Downloading ${fileName} (${fileType})...\n\nNote: This file was uploaded before file storage was implemented.`);
    }
  };

  // Check if user has admin access
  const hasAdminAccess = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    console.log('Admin access check:', { user: user?.id, role: user?.role, hasAdminAccess });
    if (hasAdminAccess) {
      console.log('Loading message data...');
      loadMessageData();
    } else {
      console.log('Access denied - user role:', user?.role);
    }
  }, [hasAdminAccess, user]);

  // Force load button for testing
  const forceLoadData = () => {
    console.log('Force loading message data...');
    loadMessageData();
  };

  useEffect(() => {
    applyFilters();
  }, [messages, filters]);

  const loadMessageData = async () => {
    try {
      setLoading(true);
      console.log('Loading message data for user:', user?.id, 'role:', user?.role);
      
      // Load all users for sender/recipient filtering
      const allUsers = await dbOperations.getUsers();
      console.log('Loaded users:', allUsers.length);
      setUsers(allUsers);
      
      // Load all emails from the system
      console.log('Calling apiClient.getAllEmails with userId:', user?.id);
      const allEmails = await apiClient.getAllEmails(user?.id);
      console.log('Loaded emails:', allEmails.length);
      console.log('First few emails:', allEmails.slice(0, 3));
      console.log('Email data structure:', allEmails.length > 0 ? typeof allEmails[0] : 'No emails');
      
      // Load email reads data
      const emailReads = await dbOperations.getEmailReads();
      console.log('Loaded email reads:', emailReads.length);
      
      // Process messages with user data
      const processedMessages: MessageLogEntry[] = [];
      
      for (const email of allEmails) {
        // Get sender information
        const sender = allUsers.find(u => u.id === email.senderId);
        if (!sender) {
          console.log('No sender found for email:', email.id, 'senderId:', email.senderId);
          continue;
        }
        
        // Get recipient information
        const recipients = email.recipientIds
          .map(recipientId => allUsers.find(u => u.id === recipientId))
          .filter(Boolean) as User[];
        
        // Get read information
        const readBy = emailReads
          .filter(read => read.emailId === email.id)
          .map(read => {
            const reader = allUsers.find(u => u.id === read.userId);
            return reader ? { user: reader, readAt: new Date(read.readAt) } : null;
          })
          .filter(Boolean) as { user: User; readAt: Date }[];
        
        processedMessages.push({
          id: email.id,
          subject: email.subject,
          body: email.body,
          sender,
          recipients,
          sentAt: new Date(email.sentAt),
          readBy,
          attachments: email.attachments || [],
          priority: email.priority || 'normal'
        });
      }
      
      // Sort by sent date (newest first)
      processedMessages.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
      
      console.log('Processed messages:', processedMessages.length);
      setMessages(processedMessages);
    } catch (error) {
      console.error('Error loading message data:', error);
      alert('Error loading message data: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...messages];
    
    console.log('Applying filters to', messages.length, 'messages');
    console.log('Current filters:', filters);
    
    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(msg => 
        msg.subject.toLowerCase().includes(query) ||
        msg.body.toLowerCase().includes(query) ||
        msg.sender.email.toLowerCase().includes(query) ||
        msg.sender.firstName.toLowerCase().includes(query) ||
        msg.sender.lastName.toLowerCase().includes(query) ||
        msg.recipients.some(recipient => 
          recipient.email.toLowerCase().includes(query) ||
          recipient.firstName.toLowerCase().includes(query) ||
          recipient.lastName.toLowerCase().includes(query)
        )
      );
    }
    
    // Sender filter
    if (filters.senderId) {
      filtered = filtered.filter(msg => msg.sender.id === filters.senderId);
    }
    
    // Recipient filter
    if (filters.recipientId) {
      filtered = filtered.filter(msg => 
        msg.recipients.some(recipient => recipient.id === filters.recipientId)
      );
    }
    
    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(msg => msg.sentAt >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // Include entire day
      filtered = filtered.filter(msg => msg.sentAt <= toDate);
    }
    
    // Attachment filter
    if (filters.hasAttachments) {
      filtered = filtered.filter(msg => msg.attachments.length > 0);
    }
    
    // Read status filter
    if (filters.isRead === 'read') {
      filtered = filtered.filter(msg => msg.readBy.length > 0);
    } else if (filters.isRead === 'unread') {
      filtered = filtered.filter(msg => msg.readBy.length === 0);
    }
    
    // Priority filter
    if (filters.priority) {
      filtered = filtered.filter(msg => msg.priority === filters.priority);
    }
    
    console.log('After filtering:', filtered.length, 'messages');
    setFilteredMessages(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleFilterChange = (key: keyof MessageLogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    applyFilters();
  };

  const clearFilters = () => {
    setFilters({
      searchQuery: '',
      senderId: '',
      recipientId: '',
      dateFrom: '',
      dateTo: '',
      hasAttachments: false,
      isRead: '',
      priority: ''
    });
  };

  const exportMessages = () => {
    const csvContent = [
      ['Subject', 'Sender', 'Recipients', 'Sent At', 'Read By', 'Has Attachments', 'Priority'],
      ...filteredMessages.map(msg => [
        `"${msg.subject.replace(/"/g, '""')}"`,
        `"${msg.sender.firstName} ${msg.sender.lastName} <${msg.sender.email}>"`,
        `"${msg.recipients.map(r => `${r.firstName} ${r.lastName} <${r.email}>`).join('; ')}"`,
        msg.sentAt.toLocaleString(),
        msg.readBy.length.toString(),
        (msg.attachments.length > 0).toString(),
        msg.priority
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Pagination
  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMessages = filteredMessages.slice(startIndex, startIndex + itemsPerPage);

  if (!hasAdminAccess) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Access Denied</h2>
          <p className="text-red-700">You don't have permission to view the message log.</p>
          <p className="text-red-600 text-sm mt-2">
            Current role: {user?.role || 'unknown'} (Required: admin or manager)
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading message log...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Message Log</h1>
            <p className="text-gray-600 mt-1">Comprehensive view of all system messages</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={forceLoadData}
              className="btn-secondary bg-red-500 text-white hover:bg-red-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Force Load (Test)
            </button>
            <button
              onClick={loadMessageData}
              className="btn-secondary"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
            <button
              onClick={exportMessages}
              className="btn-primary"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4">
          <div className="flex space-x-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search messages by subject, content, sender, or recipients..."
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Search
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Sender Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sender</label>
                <select
                  value={filters.senderId}
                  onChange={(e) => handleFilterChange('senderId', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Senders</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
                <select
                  value={filters.recipientId}
                  onChange={(e) => handleFilterChange('recipientId', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Recipients</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Read Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Read Status</label>
                <select
                  value={filters.isRead}
                  onChange={(e) => handleFilterChange('isRead', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Messages</option>
                  <option value="read">Read</option>
                  <option value="unread">Unread</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Priorities</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Has Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
                <select
                  value={filters.hasAttachments}
                  onChange={(e) => handleFilterChange('hasAttachments', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value={false}>All Messages</option>
                  <option value={true}>With Attachments</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {filteredMessages.length === 0 
              ? `No messages found${messages.length > 0 ? ' matching your filters' : ''}`
              : `Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, filteredMessages.length)} of ${filteredMessages.length} messages`
            }
          </span>
          {filters.searchQuery && (
            <span className="text-blue-600">
              Search results for "{filters.searchQuery}"
            </span>
          )}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto">
        {paginatedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">No messages found</p>
              <p className="text-sm text-gray-400">
                {messages.length === 0 
                  ? "No messages available in the system"
                  : "Try adjusting your search criteria or filters"
                }
              </p>
              {messages.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paginatedMessages.map((message) => (
              <div
                key={message.id}
                className="p-4 hover:bg-gray-50 cursor-pointer border-l-4 border-transparent hover:border-blue-400 transition-colors"
                onClick={() => setSelectedMessage(message)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {message.subject}
                      </h3>
                      {message.priority === 'high' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          High
                        </span>
                      )}
                      {message.attachments.length > 0 && (
                        <Paperclip className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                      <div className="flex items-center space-x-1">
                        <UserIcon className="w-3 h-3" />
                        <span>{message.sender.firstName} {message.sender.lastName}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>{message.recipients.length} recipient{message.recipients.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{message.sentAt.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {message.body.substring(0, 150)}
                      {message.body.length > 150 && '...'}
                    </p>
                  </div>
                  
                  <div className="ml-4 flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {message.readBy.length > 0 ? (
                          <span className="text-green-600">
                            {message.readBy.length} read
                          </span>
                        ) : (
                          <span className="text-gray-400">Unread</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm border rounded-md ${
                    page === currentPage
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {selectedMessage.subject}
                  </h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <UserIcon className="w-4 h-4" />
                      <span>
                        From: {selectedMessage.sender.firstName} {selectedMessage.sender.lastName}
                        <span className="text-gray-500"> &lt;{selectedMessage.sender.email}&gt;</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{selectedMessage.sentAt.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Recipients */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">To:</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedMessage.recipients.map(recipient => (
                    <span
                      key={recipient.id}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                    >
                      {recipient.firstName} {recipient.lastName}
                      <span className="text-gray-500 ml-1">&lt;{recipient.email}&gt;</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Read Status */}
              {selectedMessage.readBy.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Read By:</h3>
                  <div className="space-y-1">
                    {selectedMessage.readBy.map((read, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>
                          {read.user.firstName} {read.user.lastName}
                          <span className="text-gray-500 ml-1">&lt;{read.user.email}&gt;</span>
                        </span>
                        <span className="text-gray-500">
                          {read.readAt.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Body */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Message:</h3>
                <div className="prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: selectedMessage.body }} />
                </div>
              </div>

              {/* Attachments */}
              {selectedMessage.attachments.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <Paperclip className="w-5 h-5 text-gray-600" />
                    <h4 className="text-sm font-medium text-gray-900">
                      {selectedMessage.attachments.length} Attachment{selectedMessage.attachments.length > 1 ? 's' : ''}
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {selectedMessage.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center space-x-3">
                          <Paperclip className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                          </div>
                        </div>
                        <button
                          className="px-3 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors"
                          onClick={() => downloadAttachment(attachment.name, attachment.type, attachment.filename)}
                          title="Download attachment"
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageLog;