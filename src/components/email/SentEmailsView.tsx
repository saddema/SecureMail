import React, { useState, useEffect } from 'react';
import { Email, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getUserById } from '../../utils/mockData';
import { dbOperations } from '../../utils/database';
import { apiClient } from '../../utils/api';
import { useSocket } from '../../hooks/useSocket';
import { useNotifications } from '../../hooks/useNotifications';
import { Search, Filter, Eye, EyeOff, Clock, CheckCircle, Users, Mail, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface SentEmail extends Email {
  sentTo: string[];
  readBy: { userId: string; readAt: Date }[];
  deliveredTo: string[];
  attachments?: { name: string; size: number; type: string }[];
}

// Component to handle async user name display
const RecipientName: React.FC<{ userId: string; isLast: boolean }> = ({ userId, isLast }) => {
  const [userName, setUserName] = useState<string>('Loading...');

  useEffect(() => {
    const loadUserName = async () => {
      try {
        const user = await getUserById(userId);
        if (user) {
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          setUserName(fullName || 'Unknown User');
        } else {
          setUserName('Unknown User');
        }
      } catch (error) {
        setUserName('Unknown User');
      }
    };
    loadUserName();
  }, [userId]);

  return (
    <span className="text-sm text-gray-600">
      {userName}
      {!isLast && ', '}
    </span>
  );
};

// Component to handle async recipient read status
const RecipientReadStatus: React.FC<{ 
  recipientId: string; 
  readInfo?: { userId: string; readAt: Date } 
}> = ({ recipientId, readInfo }) => {
  const [recipient, setRecipient] = useState<User | null>(null);

  useEffect(() => {
    const loadRecipient = async () => {
      try {
        const user = await getUserById(recipientId);
        setRecipient(user || null);
      } catch (error) {
        setRecipient(null);
      }
    };
    loadRecipient();
  }, [recipientId]);

  if (!recipient) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
      <div className="flex items-center">
        <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center mr-3">
          <span className="text-primary-600 text-sm font-medium">
            {recipient.firstName?.[0] || recipient.lastName?.[0] || 'U'}
          </span>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">
            {`${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || 'Unknown User'}
          </div>
          <div className="text-xs text-gray-500">{recipient.email}</div>
        </div>
      </div>
      
      <div className="flex items-center">
        {readInfo ? (
          <div className="flex items-center text-green-600">
            <CheckCircle className="w-4 h-4 mr-1" />
            <span className="text-sm">
              Read {readInfo.readAt.toLocaleDateString()} at {readInfo.readAt.toLocaleTimeString()}
            </span>
          </div>
        ) : (
          <div className="flex items-center text-gray-400">
            <Clock className="w-4 h-4 mr-1" />
            <span className="text-sm">Not read yet</span>
          </div>
        )}
      </div>
    </div>
  );
};

const SentEmailsView: React.FC = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const notifications = useNotifications();
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);
  const [showReadReceipts, setShowReadReceipts] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [emailsPerPage, setEmailsPerPage] = useState(50);

  // Check permissions - only managers, team-leaders, admins, and bde can see sent emails
  const canViewSentEmails = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'team-leader' || user?.role === 'bde';

  // Add refresh function to reload sent emails
  const refreshSentEmails = async () => {
    if (canViewSentEmails && user?.id) {
      try {
        const sentEmailsData = await apiClient.getSentEmails(user.id);
        const emailReads = await dbOperations.getEmailReads();
        
        const sentEmailsWithDetails = sentEmailsData.map(email => {
          // Get read receipts for this email
          const emailReadRecords = emailReads.filter(read => read.emailId === email.id);
          const readBy = emailReadRecords.map(read => ({
            userId: read.userId,
            readAt: read.readAt
          }));
          
          return {
            ...email,
            sentTo: email.recipientIds,
            readBy,
            deliveredTo: email.recipientIds,
            attachments: email.attachments || []
          };
        });
        setSentEmails(sentEmailsWithDetails);
      } catch (error) {
        console.error('Error loading sent emails:', error);
      }
    }
  };

  useEffect(() => {
    refreshSentEmails();
  }, [canViewSentEmails, user?.id]);

  // Handle real-time email read notifications
  useEffect(() => {
    if (socket && user?.id) {
      const handleEmailRead = async (data: any) => {
        console.log('Email read notification received:', data);
        // Refresh sent emails to update read status
        refreshSentEmails();
        
        // Show desktop push notification for read receipt
        if (notifications.isPermissionGranted) {
          await notifications.showReadReceiptNotification({
            emailSubject: data.emailSubject || 'Your email',
            readerName: data.readerName || 'Someone',
            readAt: data.readAt || new Date().toISOString(),
            emailId: data.emailId || data.id
          });
        }
      };

      socket.on('email-read', handleEmailRead);

      return () => {
        socket.off('email-read', handleEmailRead);
      };
    }
  }, [socket, user?.id, notifications]);

  // Download read receipt report
  const handleDownloadReadReceipt = async (email: SentEmail) => {
    try {
      const response = await fetch(`http://localhost:5050/api/emails/${email.id}/read-receipts`);
      if (!response.ok) {
        throw new Error('Failed to fetch read receipt data');
      }
      
      const data = await response.json();
      // Ensure data is always an array
      const dataArray = Array.isArray(data) ? data : [data];
      const csvContent = await generateReadReceiptCSV(dataArray, email);
      
      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `read-receipt-${email.subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading read receipt:', error);
      alert('Failed to download read receipt report. Please try again.');
    }
  };

  // Generate CSV content for read receipt report
   const generateReadReceiptCSV = async (data: any[], email: SentEmail) => {
     // Get sender information
     const sender = await getUserById(email.senderId);
     const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown Sender';
     
     const headers = ['Email Subject', 'Sent By', 'Sent Date', 'Sent Time', 'Recipient Name', 'Email', 'Role', 'Status', 'Read At', 'Time to Read'];
     const csvRows = [headers.join(',')];
     
     data.forEach(recipient => {
       const sentDate = email.sentAt || email.createdAt;
       const timeToRead = recipient.readAt 
         ? Math.round((new Date(recipient.readAt).getTime() - new Date(sentDate).getTime()) / (1000 * 60)) + ' minutes'
         : 'N/A';
       
       const row = [
         `"${email.subject}"`,
         `"${senderName}"`,
         `"${new Date(sentDate).toLocaleDateString()}"`,
         `"${new Date(sentDate).toLocaleTimeString()}"`,
         `"${recipient.recipientName}"`,
         `"${recipient.recipientEmail}"`,
         `"${recipient.recipientRole}"`,
         `"${recipient.isRead ? 'Read' : 'Unread'}"`,
         recipient.readAt ? `"${new Date(recipient.readAt).toLocaleString()}"` : '"Not read"',
         `"${timeToRead}"`
       ];
       csvRows.push(row.join(','));
     });
     
     return csvRows.join('\n');
   };

  // Filter emails based on search and status
  const filteredEmails = sentEmails.filter(email => {
    const matchesSearch = searchQuery === '' || 
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.body.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'read') {
      matchesStatus = email.readBy.length === email.sentTo.length;
    } else if (statusFilter === 'unread') {
      matchesStatus = email.readBy.length < email.sentTo.length;
    } else if (statusFilter === 'partial') {
      matchesStatus = email.readBy.length > 0 && email.readBy.length < email.sentTo.length;
    }

    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalEmails = filteredEmails.length;
  const totalPages = Math.ceil(totalEmails / emailsPerPage);
  const startIndex = (currentPage - 1) * emailsPerPage;
  const endIndex = startIndex + emailsPerPage;
  const paginatedEmails = filteredEmails.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, emailsPerPage]);

  const getUser = async (userId: string): Promise<User | undefined> => {
    return await getUserById(userId);
  };

  const getReadStatus = (email: SentEmail) => {
    const totalRecipients = email.sentTo.length;
    const readCount = email.readBy.length;
    
    if (readCount === 0) return { status: 'unread', color: 'text-red-600', bg: 'bg-red-100' };
    if (readCount === totalRecipients) return { status: 'read', color: 'text-green-600', bg: 'bg-green-100' };
    return { status: 'partial', color: 'text-yellow-600', bg: 'bg-yellow-100' };
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

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

  if (!canViewSentEmails) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Access denied. You don't have permission to view sent emails.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sent Emails</h1>
            <p className="text-gray-600 mt-1">Track sent emails and read receipts</p>
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

            {/* Refresh button */}
            <button
              onClick={refreshSentEmails}
              className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              title="Refresh sent emails"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <span className="text-sm text-gray-500">
              Showing {startIndex + 1}-{Math.min(endIndex, totalEmails)} of {totalEmails} emails
            </span>
            
            {/* Emails per page selector */}
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

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search sent emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-field"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-48"
          >
            <option value="all">All Status</option>
            <option value="read">Fully Read</option>
            <option value="partial">Partially Read</option>
            <option value="unread">Unread</option>
          </select>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1">
        <div className="divide-y divide-gray-200">
          {paginatedEmails.map((email) => {
            const readStatus = getReadStatus(email);
            return (
              <div
                key={email.id}
                className="p-4 hover:bg-gray-50 cursor-pointer border-l-4 border-transparent hover:border-primary-500"
                onClick={() => setSelectedEmail(email)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {email.subject}
                      </h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${readStatus.bg} ${readStatus.color}`}>
                        {readStatus.status === 'read' ? 'All Read' : 
                         readStatus.status === 'partial' ? 'Partially Read' : 'Unread'}
                      </span>
                      {email.priority === 'high' && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          High Priority
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <div className="line-clamp-2">
                        {email.body.replace(/<[^>]*>/g, '').substring(0, 150)}
                        {email.body.length > 150 ? '...' : ''}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Users className="w-2 h-2 mr-1" />
                        {email.sentTo.length} recipients
                      </span>
                      <span className="flex items-center">
                        <Eye className="w-2 h-2 mr-1" />
                        {email.readBy.length} read
                      </span>
                      {email.attachments.length > 0 && (
                        <span className="flex items-center">
                          📎 {email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}
                        </span>
                      )}
                      <span>{email.createdAt.toLocaleDateString()} {email.createdAt.toLocaleTimeString()}</span>
                    </div>
                  </div>
                  
                  <div className="ml-4 flex-shrink-0 flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadReadReceipt(email);
                      }}
                      className="text-green-600 hover:text-green-800 text-sm flex items-center"
                      title="Download Read Receipt Report"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEmail(email);
                        setShowReadReceipts(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredEmails.length === 0 && (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sent emails found</h3>
            <p className="text-gray-500">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      {/* Email Detail Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedEmail.subject}
                </h3>
                <button
                  onClick={() => {
                    setSelectedEmail(null);
                    setShowReadReceipts(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div>
                  <strong>Sent:</strong> {selectedEmail.createdAt.toLocaleDateString()} at {selectedEmail.createdAt.toLocaleTimeString()}
                </div>
                <div>
                  <strong>Recipients:</strong> {selectedEmail.sentTo.length}
                </div>
                <div>
                  <strong>Read by:</strong> {selectedEmail.readBy.length} of {selectedEmail.sentTo.length}
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-96 no-scrollbar">
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: selectedEmail.body.replace(/\n/g, '<br>') }} />
              </div>

              {selectedEmail.attachments.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Attachments</h4>
                  <div className="space-y-2">
                    {selectedEmail.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-700">📎 {attachment.name}</span>
                          <span className="text-xs text-gray-500 ml-2">({formatFileSize(attachment.size)})</span>
                        </div>
                        <button
                          onClick={() => downloadAttachment(attachment.name, attachment.type, attachment.filename)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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

            {/* Read Receipts */}
            <div className="border-t border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-900">Read Receipts</h4>
                <button
                  onClick={() => handleDownloadReadReceipt(selectedEmail)}
                  className="text-green-600 hover:text-green-800 text-sm flex items-center"
                  title="Download Read Receipt Report"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download CSV
                </button>
              </div>
              <div className="space-y-3">
                {selectedEmail.sentTo.map((recipientId) => {
                  const readInfo = selectedEmail.readBy.find(r => r.userId === recipientId);
                  
                  return (
                    <RecipientReadStatus 
                      key={recipientId} 
                      recipientId={recipientId} 
                      readInfo={readInfo}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SentEmailsView;