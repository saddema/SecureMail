import React, { useState, useEffect, useMemo } from 'react';
import { EmailWithSender } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getEmailsWithSender, markEmailAsRead } from '../../utils/mockData';
import { dbOperations } from '../../utils/database';
import EmailList from './EmailList';
import EmailDetail from './EmailDetail';
import { useSocket } from '../../hooks/useSocket';
import { useNotifications } from '../../hooks/useNotifications';
import { Search, Filter, RefreshCw, ChevronLeft, ChevronRight, CheckSquare, Square, Mail, MailOpen, Trash2, Archive
} from 'lucide-react';

interface InboxViewProps {
  searchQuery: string;
  onReply?: (email: EmailWithSender) => void;
  onForward?: (email: EmailWithSender) => void;
}

const InboxView: React.FC<InboxViewProps> = ({ searchQuery, onReply, onForward }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const notifications = useNotifications();
  const [emails, setEmails] = useState<EmailWithSender[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailWithSender | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [emailsPerPage, setEmailsPerPage] = useState(50);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [newEmailNotification, setNewEmailNotification] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add refresh function to reload emails
  const refreshEmails = async () => {
    if (user?.id) {
      setLoading(true);
      try {
        const emailsWithSender = await getEmailsWithSender(user.id);
        const userEmails = emailsWithSender.filter(email => 
          email.recipientIds.includes(user.id)
        );
        setEmails(userEmails);
      } catch (error) {
        console.error('Error loading emails:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Load emails on component mount
  useEffect(() => {
    const loadEmails = async () => {
      if (user?.id) {
        setLoading(true);
        try {
          const emailsWithSender = await getEmailsWithSender(user.id);
          const userEmails = emailsWithSender.filter(email => 
            email.recipientIds.includes(user.id)
          );
          setEmails(userEmails);
        } catch (error) {
          console.error('Error loading emails:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    loadEmails();
  }, [user?.id]);

  // Handle real-time email notifications
  useEffect(() => {
    if (socket && user?.id) {
      const handleNewEmail = async (data: any) => {
        console.log('New email received:', data);
        // Refresh emails when a new email arrives
        refreshEmails();
        
        // Show desktop push notification instead of in-app notification
        if (notifications.isPermissionGranted) {
          await notifications.showEmailNotification({
            subject: data.subject,
            senderName: data.senderName,
            senderEmail: data.senderEmail,
            priority: data.priority || 'normal',
            bodyPreview: data.body?.substring(0, 100) || 'New email received',
            emailId: data.emailId || data.id
          });
        } else {
          // Fallback to in-app notification if desktop notifications are not permitted
          const priorityIcon = data.priority === 'high' ? '🔴' : data.priority === 'low' ? '🟢' : '🔵';
          setNewEmailNotification(`${priorityIcon} New email from ${data.senderName}: ${data.subject}`);
          setTimeout(() => setNewEmailNotification(null), 5000);
        }
      };

      socket.on('new-email', handleNewEmail);

      return () => {
        socket.off('new-email', handleNewEmail);
      };
    }
  }, [socket, user?.id, notifications]);

  // Filter emails based on search query and filters
  const filteredEmails = useMemo(() => {
    let filtered = emails;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(email => 
        email.subject.toLowerCase().includes(query) ||
        email.body.toLowerCase().includes(query) ||
        `${email.sender.firstName} ${email.sender.lastName}`.toLowerCase().includes(query) ||
        email.sender.email.toLowerCase().includes(query)
      );
    }

    // Filter by unread status
    if (filterUnread) {
      filtered = filtered.filter(email => !email.isRead);
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [emails, searchQuery, filterUnread]);

  // Pagination logic
  const totalEmails = filteredEmails.length;
  const totalPages = Math.ceil(totalEmails / emailsPerPage);
  const startIndex = (currentPage - 1) * emailsPerPage;
  const endIndex = startIndex + emailsPerPage;
  const paginatedEmails = filteredEmails.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterUnread, emailsPerPage]);

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
    refreshEmails();
  };

  const handleDeleteEmail = async (email: EmailWithSender) => {
    if (confirm('Are you sure you want to move this email to trash?')) {
      try {
        if (!user?.id) {
          alert('User not authenticated');
          return;
        }
        
        // Set loading state
        setIsDeleting(true);
        
        // Store the original email list for rollback if needed
        const originalEmails = emails;
        const originalSelectedEmail = selectedEmail;
        
        // Optimistically remove email from the list
        setEmails(prevEmails => prevEmails.filter(e => e.id !== email.id));
        
        // Go back to list view if this email was selected
        if (selectedEmail?.id === email.id) {
          setSelectedEmail(null);
        }
        
        // Try to delete on server
        await dbOperations.deleteEmail(email.id, user.id);
        
        // Success - show confirmation (no alert needed since UI updates immediately)
        console.log('Email moved to trash successfully!');
        
      } catch (error) {
        console.error('Error moving email to trash:', error);
        
        // Revert the optimistic update on error
        setEmails(originalEmails);
        setSelectedEmail(originalSelectedEmail);
        
        alert('Failed to move email to trash. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleArchiveEmail = async (email: EmailWithSender) => {
    if (confirm('Are you sure you want to archive this email?')) {
      try {
        if (!user?.id) {
          alert('User not authenticated');
          return;
        }
        
        await dbOperations.bulkArchiveEmails([email.id], user.id);
        
        // Remove email from the list
        setEmails(prevEmails => prevEmails.filter(e => e.id !== email.id));
        
        // Go back to list view if this email was selected
        if (selectedEmail?.id === email.id) {
          setSelectedEmail(null);
        }
        
        alert('Email archived successfully!');
      } catch (error) {
        console.error('Error archiving email:', error);
        alert('Failed to archive email. Please try again.');
      }
    }
  };

  const handleEmailRead = async (emailId: string) => {
    if (user?.id) {
      try {
        await markEmailAsRead(emailId, user.id);
        // Update local state
        setEmails(prevEmails => 
          prevEmails.map(email => 
            email.id === emailId 
              ? { ...email, isRead: true, readAt: new Date() }
              : email
          )
        );
      } catch (error) {
        console.error('Error marking email as read:', error);
      }
    }
  };

  const handleRefresh = async () => {
    await refreshEmails();
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
        await markEmailAsRead(emailId, user?.id || '');
      }
      
      // Update local state
      setEmails(prevEmails => 
        prevEmails.map(email => 
          selectedEmails.includes(email.id) 
            ? { ...email, isRead: true, readAt: new Date() }
            : email
        )
      );
      
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
      
      // Update local state
      setEmails(prevEmails => 
        prevEmails.map(email => 
          selectedEmails.includes(email.id) 
            ? { ...email, isRead: false, readAt: undefined }
            : email
        )
      );
      
      setSelectedEmails([]);
      alert(`${selectedEmails.length} email(s) marked as unread`);
    } catch (error) {
      console.error('Error marking emails as unread:', error);
      alert('Failed to mark emails as unread');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEmails.length === 0) return;
    
    if (confirm(`Are you sure you want to move ${selectedEmails.length} email(s) to trash?`)) {
      try {
        // Set loading state
        setIsDeleting(true);
        
        // Store original state for rollback
        const originalEmails = emails;
        const originalSelectedEmails = selectedEmails;
        
        // Optimistically remove emails from the list
        setEmails(prevEmails => prevEmails.filter(email => !selectedEmails.includes(email.id)));
        setSelectedEmails([]);
        
        // Try to delete on server
        for (const emailId of selectedEmails) {
          await dbOperations.deleteEmail(emailId, user?.id || '');
        }
        
        // Success
        console.log(`${selectedEmails.length} email(s) moved to trash`);
      } catch (error) {
        console.error('Error deleting emails:', error);
        
        // Revert optimistic update on error
        setEmails(originalEmails);
        setSelectedEmails(originalSelectedEmails);
        
        alert('Failed to delete emails');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleBulkArchive = async () => {
    if (selectedEmails.length === 0) return;
    
    if (confirm(`Are you sure you want to archive ${selectedEmails.length} email(s)?`)) {
      try {
        await dbOperations.bulkArchiveEmails(selectedEmails, user?.id || '');
        
        // Remove emails from the list
        setEmails(prevEmails => prevEmails.filter(email => !selectedEmails.includes(email.id)));
        setSelectedEmails([]);
        alert(`${selectedEmails.length} email(s) archived successfully`);
      } catch (error) {
        console.error('Error archiving emails:', error);
        alert('Failed to archive emails');
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
          <p className="text-gray-600">Loading emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* New Email Notification */}
      {newEmailNotification && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 m-4 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">{newEmailNotification}</p>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setNewEmailNotification(null)}
                className="text-blue-400 hover:text-blue-600"
              >
                <span className="sr-only">Dismiss</span>
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inbox Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-primary-100 text-primary-800 text-sm font-medium rounded-full">
                {unreadCount} unread
              </span>
            )}
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
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="mt-3 text-sm text-gray-600">
            {filteredEmails.length === 0 ? (
              <span>No emails found for "{searchQuery}"</span>
            ) : (
              <span>
                {filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''} found for "{searchQuery}"
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
            onDelete={handleDeleteEmail}
            isDeleting={isDeleting}
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
                      Showing {startIndex + 1}-{Math.min(endIndex, totalEmails)} of {totalEmails} email{totalEmails !== 1 ? 's' : ''}
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
                              onClick={handleBulkMarkAsRead}
                              className="flex items-center space-x-1 px-2 py-1 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                            >
                              <MailOpen className="w-2 h-2" />
                              <span>Mark Read</span>
                            </button>
                            
                            <button
                              onClick={handleBulkMarkAsUnread}
                              className="flex items-center space-x-1 px-2 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                            >
                              <Mail className="w-2 h-2" />
                              <span>Mark Unread</span>
                            </button>
                            
                            <button
                              onClick={handleBulkArchive}
                              className="flex items-center space-x-1 px-2 py-1 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded"
                            >
                              <Archive className="w-2 h-2" />
                              <span>Archive</span>
                            </button>
                            
                            <button
                              onClick={handleBulkDelete}
                              className="flex items-center space-x-1 px-2 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-2 h-2" />
                              )}
                              <span>Delete</span>
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
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                      </select>
                      <span className="text-sm text-gray-600">per page</span>
                    </div>
                    
                    {/* Pagination controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        <span className="text-sm text-gray-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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

export default InboxView;