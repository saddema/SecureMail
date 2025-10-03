import React, { useState, useEffect } from 'react';
import { Email } from '../../types';
import { getUserById } from '../../utils/mockData';
import { Trash2, RotateCcw, AlertTriangle, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface TrashViewProps {
  currentUserId: string;
}

const TrashView: React.FC<TrashViewProps> = ({ currentUserId }) => {
  const [trashedEmails, setTrashedEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [emailsPerPage, setEmailsPerPage] = useState(50);

  useEffect(() => {
    loadTrashedEmails();
  }, []);

  const loadTrashedEmails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5050/api/trash?userId=${currentUserId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trashed emails');
      }
      const data = await response.json();
      setTrashedEmails(data);
    } catch (error) {
      console.error('Error loading trashed emails:', error);
      setError('Failed to load trashed emails');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (emailId: string) => {
    try {
      const response = await fetch(`http://localhost:5050/api/trash/${emailId}/restore`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUserId }),
      });
      if (!response.ok) {
        throw new Error('Failed to restore email');
      }
      // Remove from trash list
      setTrashedEmails(prev => prev.filter(email => email.id !== emailId));
    } catch (error) {
      console.error('Error restoring email:', error);
      setError('Failed to restore email');
    }
  };

  const handlePermanentDelete = async (emailId: string) => {
    if (!confirm('Are you sure you want to permanently delete this email? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5050/api/trash/${emailId}/permanent`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUserId }),
      });
      if (!response.ok) {
        throw new Error('Failed to permanently delete email');
      }
      // Remove from trash list
      setTrashedEmails(prev => prev.filter(email => email.id !== emailId));
    } catch (error) {
      console.error('Error permanently deleting email:', error);
      setError('Failed to permanently delete email');
    }
  };

  const handleEmptyTrash = async () => {
    try {
      const response = await fetch(`http://localhost:5050/api/trash/empty`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUserId }),
      });
      if (!response.ok) {
        throw new Error('Failed to empty trash');
      }
      setTrashedEmails([]);
    } catch (error) {
      console.error('Error emptying trash:', error);
      setError('Failed to empty trash');
    }
  };

  const getSenderName = async (senderId: string) => {
    try {
      const user = await getUserById(senderId);
      return user ? `${user.firstName} ${user.lastName}` : 'Unknown Sender';
    } catch (error) {
      return 'Unknown Sender';
    }
  };

  const [senderNames, setSenderNames] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const loadSenderNames = async () => {
      const names: { [key: string]: string } = {};
      for (const email of trashedEmails) {
        if (!names[email.senderId]) {
          names[email.senderId] = await getSenderName(email.senderId);
        }
      }
      setSenderNames(names);
    };

    if (trashedEmails.length > 0) {
      loadSenderNames();
    }
  }, [trashedEmails]);

  // Pagination logic
  const totalEmails = trashedEmails.length;
  const totalPages = Math.ceil(totalEmails / emailsPerPage);
  const startIndex = (currentPage - 1) * emailsPerPage;
  const endIndex = startIndex + emailsPerPage;
  const paginatedEmails = trashedEmails.slice(startIndex, endIndex);

  // Reset to first page when emails change
  useEffect(() => {
    setCurrentPage(1);
  }, [trashedEmails.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Trash2 className="h-6 w-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Trash</h1>
          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
            {trashedEmails.length}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          {trashedEmails.length > 0 && (
            <>
              <div className="flex items-center space-x-3">
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
              
              <button
                onClick={() => setShowEmptyConfirm(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Empty Trash
              </button>
            </>
          )}
        </div>
      </div>

      {showEmptyConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Empty Trash</h3>
              <div className="mt-2 text-sm text-red-700">
                Are you sure you want to permanently delete all {trashedEmails.length} emails? This action cannot be undone.
              </div>
            </div>
          </div>
          <div className="mt-4 flex space-x-2">
            <button
              onClick={handleEmptyTrash}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
            >
              Yes, Empty Trash
            </button>
            <button
              onClick={() => setShowEmptyConfirm(false)}
              className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {trashedEmails.length === 0 ? (
        <div className="text-center py-12">
          <Trash2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No emails in trash</h3>
          <p className="mt-1 text-sm text-gray-500">
            Deleted emails will appear here and can be restored or permanently deleted.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {paginatedEmails.map((email) => (
              <li key={email.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {email.subject}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          From: {senderNames[email.senderId] || 'Loading...'}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center text-xs text-gray-400">
                            <Calendar className="h-3 w-3 mr-1" />
                            Deleted: {email.deletedAt ? new Date(email.deletedAt).toLocaleString() : 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRestore(email.id)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(email.id)}
                      className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete Forever
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TrashView;