import React, { useEffect, useState } from 'react';
import { ArrowLeft, Star, Archive, Trash2, Reply, Forward, MoreVertical, Paperclip, User } from 'lucide-react';
import { EmailWithSender, User as UserType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { markEmailAsRead, markEmailAsUnread, getUserById } from '../../utils/mockData';
import { formatDistanceToNow } from 'date-fns';

interface EmailDetailProps {
  email: EmailWithSender;
  onBack: () => void;
  onEmailUpdate: (updatedEmail: EmailWithSender) => void;
  onReply?: (email: EmailWithSender) => void;
  onForward?: (email: EmailWithSender) => void;
  onDelete?: (email: EmailWithSender) => void;
  isDeleting?: boolean;
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
    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
      {userName}
      {!isLast && ', '}
    </span>
  );
};

const EmailDetail: React.FC<EmailDetailProps> = ({
  email,
  onBack,
  onEmailUpdate,
  onReply,
  onForward,
  onDelete,
  isDeleting
}) => {
  const { user } = useAuth();

  const handleMarkAsUnread = async () => {
    if (user && email.isRead) {
      try {
        await markEmailAsUnread(email.id, user.id);
        // Update the email as unread
        const updatedEmail = { ...email, isRead: false, readAt: undefined };
        if (onEmailUpdate) {
          onEmailUpdate(updatedEmail);
        }
      } catch (error) {
        console.error('Error marking email as unread:', error);
      }
    }
  };

  useEffect(() => {
    // Mark email as read when opened
    if (user && !email.isRead) {
      const markAsRead = async () => {
        try {
          await markEmailAsRead(email.id, user.id);
          // Update the email as read
          const updatedEmail = { ...email, isRead: true, readAt: new Date() };
          if (onEmailUpdate) {
            onEmailUpdate(updatedEmail);
          }
        } catch (error) {
          console.error('Error marking email as read:', error);
        }
      };
      
      markAsRead();
    }
  }, [email.id, user, email.isRead, onEmailUpdate]);

  const formatFullDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const canReply = user?.role !== 'agent';

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

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Back to inbox"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {email.subject || '(No Subject)'}
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {canReply && (
              <>
                <button
                  onClick={() => onReply?.(email)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Reply"
                >
                  <Reply className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => onForward?.(email)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Forward"
                >
                  <Forward className="w-5 h-5 text-gray-600" />
                </button>
              </>
            )}

            <button
              onClick={() => onDelete?.(email)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={isDeleting ? "Deleting..." : "Delete"}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="More actions"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-4xl mx-auto p-6">
          {/* Email Header */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4">
                {/* Sender Avatar */}
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary-600" />
                </div>

                {/* Sender Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {email.sender.firstName} {email.sender.lastName}
                    </h2>
                    <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                      {email.sender.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {email.sender.email}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFullDate(email.createdAt)}
                  </p>
                </div>
              </div>

              {/* Read Status */}
              <div className="text-right">
                {email.isRead ? (
                  <div className="flex items-center space-x-1 text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full" />
                    <span className="text-xs font-medium">Read</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    <span className="text-xs font-medium">Unread</span>
                  </div>
                )}
                {email.readAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(email.readAt, { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>

            {/* Recipients */}
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <span className="text-sm font-medium text-gray-700 w-8">To:</span>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2">
                    {email.recipientIds.map((recipientId, index) => (
                      <RecipientName
                        key={recipientId}
                        userId={recipientId}
                        isLast={index === email.recipientIds.length - 1}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {email.ccRecipientIds && email.ccRecipientIds.length > 0 && (
                <div className="flex items-start space-x-2">
                  <span className="text-sm font-medium text-gray-700 w-8">CC:</span>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2">
                      {email.ccRecipientIds.map((ccId, index) => (
                        <RecipientName
                          key={ccId}
                          userId={ccId}
                          isLast={index === email.ccRecipientIds.length - 1}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Email Body */}
          <div className="prose prose-sm max-w-none">
            <div 
              className="text-gray-900 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: email.body }}
            />
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <Paperclip className="w-5 h-5 text-gray-600" />
                <h4 className="text-sm font-medium text-gray-900">
                  {email.attachments.length} Attachment{email.attachments.length > 1 ? 's' : ''}
                </h4>
              </div>
              <div className="space-y-2">
                {email.attachments.map((attachment, index) => (
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

          {/* Reply Section (for non-agents) */}
          {canReply && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <button 
                  className="btn-primary"
                  onClick={() => onReply?.(email)}
                >
                  <Reply className="w-4 h-4 mr-2" />
                  Reply
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => onForward?.(email)}
                >
                  <Forward className="w-4 h-4 mr-2" />
                  Forward
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailDetail;