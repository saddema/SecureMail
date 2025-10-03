import React, { useState, useEffect, useMemo } from 'react';
import { EmailWithSender } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getEmailsWithSender } from '../../utils/mockData';
import { dbOperations } from '../../utils/database';
import { useSocket } from '../../hooks/useSocket';
import { useNotifications } from '../../hooks/useNotifications';
import EmailList from './EmailList';
import EmailDetail from './EmailDetail';
import { Search, Filter, RefreshCw, ChevronLeft, ChevronRight, CheckSquare, Square, Archive, ArchiveRestore } from 'lucide-react';

interface ArchiveViewProps {
  onReply?: (email: EmailWithSender) => void;
  onForward?: (email: EmailWithSender) => void;
  searchQuery?: string;
}

const ArchiveView: React.FC<ArchiveViewProps> = ({ onReply, onForward, searchQuery: globalSearchQuery }) => {
  console.log('ArchiveView component rendering');
  const { user } = useAuth();
  const socket = useSocket();
  const notifications = useNotifications();
  const [emails, setEmails] = useState<EmailWithSender[]>([]);
  const [archivedEmailIds, setArchivedEmailIds] = useState<string[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailWithSender | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [emailsPerPage, setEmailsPerPage] = useState(25);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  // Use global search query if provided, otherwise use local search
  const effectiveSearchQuery = globalSearchQuery || searchQuery;

  // Fetch archived emails
  const fetchArchivedEmails = async () => {
    console.log('fetchArchivedEmails called');
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching archived emails for user:', user.id);
      
      // Use getEmailsWithSender to get emails with sender information (already filtered for archived)
      const archivedEmails = await getEmailsWithSender(user.id, true);
      
      console.log('Found archived emails:', archivedEmails);
      
      setEmails(archivedEmails);
      setArchivedEmailIds(archivedEmails.map(email => email.id));
    } catch (error) {
      console.error('Error fetching archived emails:', error);
      setEmails([]);
      setArchivedEmailIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('ArchiveView mounted, user:', user?.id);
    if (user?.id) {
      console.log('Calling fetchArchivedEmails for user:', user.id);
      fetchArchivedEmails();
    } else {
      console.log('No user ID available');
    }
  }, [user?.id]);

  // Debug emails state changes
  useEffect(() => {
    console.log('Emails state changed:', emails.length, 'emails');
    console.log('Email IDs:', emails.map(e => e.id));
  }, [emails]);

  // Handle real-time archive/unarchive notifications
  useEffect(() => {
    if (socket && user?.id) {
      const handleEmailArchived = async (data: any) => {
        console.log('Email archived notification received:', data);
        
        // Show desktop notification if permission granted
        if (notifications.isPermissionGranted) {
          await notifications.showArchiveNotification(data.email);
        }
        
        // Refresh archived emails
        fetchArchivedEmails();
      };

      const handleEmailUnarchived = async (data: any) => {
        console.log('Email unarchived notification received:', data);
        
        // Show desktop notification if permission granted
        if (notifications.isPermissionGranted) {
          await notifications.showUnarchiveNotification(data.email);
        }
        
        // Refresh archived emails
        fetchArchivedEmails();
      };

      socket.on('email-archived', handleEmailArchived);
      socket.on('email-unarchived', handleEmailUnarchived);

      return () => {
        socket.off('email-archived', handleEmailArchived);
        socket.off('email-unarchived', handleEmailUnarchived);
      };
    }
  }, [socket, user?.id, notifications]);

  // Filter emails based on search query and unread filter
  const filteredEmails = useMemo(() => {
    console.log('Calculating filteredEmails from', emails.length, 'emails');
    let filtered = emails;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(email =>
        email.subject.toLowerCase().includes(query) ||
        email.body.toLowerCase().includes(query) ||
        `${email.sender.firstName} ${email.sender.lastName}`.toLowerCase().includes(query) ||
        email.sender.email.toLowerCase().includes(query)
      );
      console.log('After search filter:', filtered.length, 'emails');
    }

    if (filterUnread) {
      filtered = filtered.filter(email => !email.isRead);
      console.log('After unread filter:', filtered.length, 'emails');
    }

    console.log('Final filteredEmails:', filtered.length, 'emails');
    return filtered;
  }, [emails, searchQuery, filterUnread]);

  // Pagination
  const totalEmails = filteredEmails.length;
  const totalPages = Math.ceil(totalEmails / emailsPerPage);
  const startIndex = (currentPage - 1) * emailsPerPage;
  const endIndex = startIndex + emailsPerPage;
  const paginatedEmails = filteredEmails.slice(startIndex, endIndex);

  console.log('Pagination debug:', {
    totalEmails,
    totalPages,
    currentPage,
    emailsPerPage,
    startIndex,
    endIndex,
    paginatedEmailsLength: paginatedEmails.length
  });

  const handleEmailClick = (email: EmailWithSender) => {
    setSelectedEmail(email);
  };

  const handleBackToList = () => {
    setSelectedEmail(null);
  };

  const handleEmailUpdate = (updatedEmail: EmailWithSender) => {
    setEmails(prevEmails => {
      const updatedEmails = prevEmails.map(email => 
        email.id === updatedEmail.id ? updatedEmail : email
      );
      return updatedEmails;
    });
    
    if (selectedEmail?.id === updatedEmail.id) {
      setSelectedEmail(updatedEmail);
    }
    
    // Refresh emails from database to ensure consistency
    fetchArchivedEmails();
  };

  const handleUnarchiveEmail = async (email: EmailWithSender) => {
    if (confirm('Are you sure you want to unarchive this email?')) {
      try {
        if (!user?.id) {
          alert('User not authenticated');
          return;
        }
        
        await dbOperations.unarchiveEmail(email.id, user.id);
        
        // Remove email from the list
        setEmails(prevEmails => prevEmails.filter(e => e.id !== email.id));
        
        // Go back to list view if this email was selected
        if (selectedEmail?.id === email.id) {
          setSelectedEmail(null);
        }
        
        alert('Email unarchived successfully!');
      } catch (error) {
        console.error('Error unarchiving email:', error);
        alert('Failed to unarchive email. Please try again.');
      }
    }
  };

  const handleRefresh = async () => {
    await fetchArchivedEmails();
  };

  // Bulk operations handlers
  const handleEmailSelect = (emailId: string, selected: boolean) => {
    setSelectedEmails(prev => {
      if (selected) {
        return [...prev, emailId];
      } else {
        return prev.filter(id => id !== emailId);
      }
    });
  };

  const handleSelectAll = () => {
    const allEmailIds = paginatedEmails.map(email => email.id);
    const allSelected = allEmailIds.every(id => selectedEmails.includes(id));
    
    if (allSelected) {
      setSelectedEmails(prev => prev.filter(id => !allEmailIds.includes(id)));
    } else {
      setSelectedEmails(prev => [...new Set([...prev, ...allEmailIds])]);
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedEmails.length === 0) return;
    
    try {
      for (const emailId of selectedEmails) {
        await dbOperations.markEmailAsRead(emailId, user?.id || '');
      }
      
      // Update emails in the list
      setEmails(prevEmails => prevEmails.map(email => 
        selectedEmails.includes(email.id) ? { ...email, isRead: true } : email
      ));
      
      setSelectedEmails([]);
      alert(`${selectedEmails.length} email(s) marked as read`);
    } catch (error) {
      console.error('Error marking emails as read:', error);
      alert('Failed to mark emails as read');
    }
  };

  const handleBulkMarkAsUnread = async () => {
    if (selectedEmails.length === 0) return;
    
    try {
      for (const emailId of selectedEmails) {
        await dbOperations.markEmailAsUnread(emailId, user?.id || '');
      }
      
      // Update emails in the list
      setEmails(prevEmails => prevEmails.map(email => 
        selectedEmails.includes(email.id) ? { ...email, isRead: false } : email
      ));
      
      setSelectedEmails([]);
      alert(`${selectedEmails.length} email(s) marked as unread`);
    } catch (error) {
      console.error('Error marking emails as unread:', error);
      alert('Failed to mark emails as unread');
    }
  };

  const handleBulkUnarchive = async () => {
    if (selectedEmails.length === 0) return;
    
    if (confirm(`Are you sure you want to unarchive ${selectedEmails.length} email(s)?`)) {
      try {
        for (const emailId of selectedEmails) {
          await dbOperations.unarchiveEmail(emailId, user?.id || '');
        }
        
        // Remove emails from the list
        setEmails(prevEmails => prevEmails.filter(email => !selectedEmails.includes(email.id)));
        setSelectedEmails([]);
        alert(`${selectedEmails.length} email(s) unarchived successfully`);
      } catch (error) {
        console.error('Error unarchiving emails:', error);
        alert('Failed to unarchive emails');
      }
    }
  };

  // Toggle bulk actions mode
  const toggleBulkActions = () => {
    setShowBulkActions(!showBulkActions);
    setSelectedEmails([]);
  };

  const unreadCount = emails.filter(email => !email.isRead).length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-7 h-7 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading archived emails...</p>
        </div>
      </div>
    );
  }

  // Debug: Show current state
  console.log('ArchiveView render state:', { 
    loading, 
    emailsCount: emails.length, 
    user: user?.id,
    filteredEmailsCount: filteredEmails.length,
    paginatedEmailsCount: paginatedEmails.length,
    totalEmails,
    currentPage,
    emailsPerPage
  });
  
  // Debug: Show actual emails data
  console.log('ArchiveView emails data:', emails);
  console.log('ArchiveView filteredEmails:', filteredEmails);
  console.log('ArchiveView paginatedEmails:', paginatedEmails);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Archive Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Archive</h1>
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-primary-100 text-primary-800 text-sm font-medium rounded-full">
                {unreadCount} unread
              </span>
            )}
            {/* Debug indicator */}
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
              Debug: {emails.length} total, {filteredEmails.length} filtered, {paginatedEmails.length} shown
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Notification Permission Button */}
            {!notifications.isPermissionGranted && notifications.isSupported && (
              <button
                onClick={async () => {
                  const granted = await notifications.requestPermission();
                  if (granted) {
                    console.log('Notification permission granted');
                  }
                }}
                className="px-3 py-2 text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-200 transition-colors"
                title="Enable Desktop Notifications"
              >
                🔔 Enable Notifications
              </button>
            )}

            {/* Bulk Actions Toggle */}
            <button
              onClick={toggleBulkActions}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                showBulkActions
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showBulkActions ? <CheckSquare className="w-4 h-4 mr-2 inline" /> : <Square className="w-4 h-4 mr-2 inline" />}
              {showBulkActions ? 'Exit Bulk' : 'Bulk Actions'}
            </button>

            {/* Filter Toggle */}
            <button
              onClick={() => setFilterUnread(!filterUnread)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterUnread
                  ? 'bg-primary-100 text-primary-700 border border-primary-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4 mr-2 inline" />
              {filterUnread ? 'Unread Only' : 'Show All'}
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="mt-3 text-sm text-gray-600">
            {filteredEmails.length === 0 ? (
              <span>No archived emails found for "{searchQuery}"</span>
            ) : (
              <span>
                {filteredEmails.length} archived email{filteredEmails.length !== 1 ? 's' : ''} found for "{searchQuery}"
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {selectedEmail ? (
          // Email Detail View
          <EmailDetail
            email={selectedEmail}
            onBack={handleBackToList}
            onEmailUpdate={handleEmailUpdate}
            onReply={onReply}
            onForward={onForward}
            onDelete={handleUnarchiveEmail}
            deleteButtonText="Unarchive"
            deleteButtonIcon={<ArchiveRestore className="w-5 h-5 text-gray-600" />}
          />
        ) : (
          // Email List View
          <div className="flex-1 flex flex-col">
            {/* Email Count */}
            {paginatedEmails.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <p className="text-sm text-gray-600">
                      Showing {startIndex + 1}-{Math.min(endIndex, totalEmails)} of {totalEmails} archived email{totalEmails !== 1 ? 's' : ''}
                      {filterUnread && ' (unread only)'}
                    </p>
                    
                    {/* Bulk Actions Bar */}
                    {showBulkActions && (
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={handleSelectAll}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {paginatedEmails.every(email => selectedEmails.includes(email.id)) ? 'Deselect All' : 'Select All'}
                        </button>
                        
                        {selectedEmails.length > 0 && (
                          <>
                            <span className="text-sm text-gray-500">|</span>
                            <span className="text-sm text-gray-600">{selectedEmails.length} selected</span>
                            
                            <button
                              onClick={handleBulkUnarchive}
                              className="flex items-center space-x-1 px-2 py-1 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded"
                            >
                              <ArchiveRestore className="w-4 h-4" />
                              <span>Unarchive</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Emails per page selector */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Show:</label>
                      <select
                        value={emailsPerPage}
                        onChange={(e) => setEmailsPerPage(Number(e.target.value))}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        <span className="text-sm text-gray-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="px-6 py-4 bg-white border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search archived emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Email List */}
            <EmailList
              emails={paginatedEmails}
              onEmailClick={handleEmailClick}
              selectedEmailId={selectedEmail?.id}
              selectedEmails={selectedEmails}
              onEmailSelect={handleEmailSelect}
              showCheckboxes={showBulkActions}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchiveView;