import React from 'react';
import { EmailWithSender } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { Mail, MailOpen, Paperclip, Star } from 'lucide-react';

interface EmailListProps {
  emails: EmailWithSender[];
  onEmailClick: (email: EmailWithSender) => void;
  selectedEmailId?: string;
  selectedEmails?: string[];
  onEmailSelect?: (emailId: string, selected: boolean) => void;
  showCheckboxes?: boolean;
}

const EmailList: React.FC<EmailListProps> = ({ 
  emails, 
  onEmailClick, 
  selectedEmailId,
  selectedEmails = [],
  onEmailSelect,
  showCheckboxes = false
}) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const emailDate = new Date(date);
    
    // If email is from today, show time
    if (emailDate.toDateString() === now.toDateString()) {
      return emailDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    // If email is from this year, show month and day
    if (emailDate.getFullYear() === now.getFullYear()) {
      return emailDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    // Otherwise show full date
    return emailDate.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric' 
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    // Remove HTML tags for preview
    const plainText = text.replace(/<[^>]*>/g, '');
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
  };

  const handleCheckboxClick = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation(); // Prevent email click
    const isSelected = selectedEmails.includes(emailId);
    onEmailSelect?.(emailId, !isSelected);
  };

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
          <p className="text-gray-500">Your inbox is empty or no emails match your search.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar">
      <div className="divide-y divide-gray-200">
        {emails.map((email) => {
          const isSelected = selectedEmailId === email.id;
          const isUnread = !email.isRead;
          const isChecked = selectedEmails.includes(email.id);
          
          return (
            <div
              key={email.id}
              onClick={() => onEmailClick(email)}
              className={`email-item ${isUnread ? 'unread' : ''} ${
                isSelected ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
              } ${isChecked ? 'bg-blue-50' : ''}`}
            >
              {/* Left Section - Checkbox, Read Status & Sender */}
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                {/* Checkbox */}
                {showCheckboxes && (
                  <div className="flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleCheckboxClick(e, email.id)}
                      onClick={(e) => handleCheckboxClick(e, email.id)}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    />
                  </div>
                )}

                {/* Read/Unread Indicator */}
                <div className="flex-shrink-0">
                  {isUnread ? (
                    <Mail className="w-2 h-2 text-primary-600" />
                  ) : (
                    <MailOpen className="w-2 h-2 text-gray-400" />
                  )}
                </div>

                {/* Sender Info */}
                <div className="flex-shrink-0 w-48">
                  <p className={`text-sm truncate ${
                    isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                  }`}>
                    {email.sender.firstName} {email.sender.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {email.sender.email}
                  </p>
                </div>

                {/* Email Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className={`text-sm truncate ${
                      isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                    }`}>
                      {email.subject || '(No Subject)'}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {truncateText(email.body, 100)}
                  </p>
                </div>
              </div>

              {/* Right Section - Date & Actions */}
              <div className="flex items-center space-x-3 flex-shrink-0">
                {/* Attachment Indicator */}
                {email.attachments && email.attachments.length > 0 && (
                  <div className="flex-shrink-0">
                    <Paperclip className="w-4 h-4 text-gray-400" title={`${email.attachments.length} attachment${email.attachments.length > 1 ? 's' : ''}`} />
                  </div>
                )}

                {/* Date */}
                <div className="text-right">
                  <p className={`text-xs ${
                    isUnread ? 'font-semibold text-gray-900' : 'text-gray-500'
                  }`}>
                    {formatDate(email.createdAt)}
                  </p>
                  {email.readAt && (
                    <p className="text-xs text-gray-400">
                      Read {formatDistanceToNow(email.readAt, { addSuffix: true })}
                    </p>
                  )}
                </div>

                {/* Unread Indicator Dot */}
                {isUnread && (
                  <div className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmailList;