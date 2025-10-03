import React, { useState, useRef } from 'react';
import { X, FileText, Upload, Download, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../utils/api';
import { getUsers } from '../../utils/mockData';

interface MailMergeData {
  [key: string]: string;
}

interface MailMergeProps {
  onClose: () => void;
}

const MailMerge: React.FC<MailMergeProps> = ({ onClose }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<MailMergeData[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setErrors(['Please upload a valid CSV file']);
      return;
    }

    setIsUploading(true);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setErrors(['CSV file must contain at least a header row and one data row']);
          setIsUploading(false);
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data: MailMergeData[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          if (values.length === headers.length) {
            const row: MailMergeData = {};
            headers.forEach((header, index) => {
              // Normalize header to lowercase for consistent access
              const normalizedHeader = header.toLowerCase();
              row[normalizedHeader] = values[index];
              // Also store with original casing for backward compatibility
              row[header] = values[index];
            });
            data.push(row);
          }
        }

        setCsvHeaders(headers);
        setCsvData(data);
        setIsUploading(false);
      } catch (error) {
        setErrors(['Error parsing CSV file. Please check the format.']);
        setIsUploading(false);
      }
    };

    reader.readAsText(file);
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById('message-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.substring(0, start) + `{{${placeholder}}}` + message.substring(end);
      setMessage(newMessage);
      
      // Set cursor position after the inserted placeholder
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length + 4, start + placeholder.length + 4);
      }, 0);
    }
  };

  const replacePlaceholders = (text: string, data: MailMergeData): string => {
    let result = text;
    Object.keys(data).forEach(key => {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), data[key]);
    });
    return result;
  };

  const handleSendEmails = async () => {
    if (!subject.trim() || !message.trim() || csvData.length === 0) {
      setErrors(['Please fill in all fields and upload a CSV file']);
      return;
    }

    setIsSending(true);
    setSendingProgress(0);
    setErrors([]);
    setSuccessCount(0);
    
    console.log('Mail Merge: Starting to send emails...');
    console.log('CSV Data:', csvData);
    
    try {
      // Get all users to map email addresses to user IDs
      console.log('Mail Merge: Fetching users...');
      const users = await getUsers();
      console.log('Mail Merge: Users fetched:', users.length, 'users');
      
      // Send emails one by one with a delay to avoid overwhelming the server
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        console.log(`Mail Merge: Processing row ${i + 1}/${csvData.length}`, row);
        
        if (!row.email || !row.email.trim()) {
          const availableFields = Object.keys(row).join(', ');
          const fieldValues = Object.entries(row).map(([key, value]) => `${key}:'${value}'`).join(', ');
          setErrors(prev => [...prev, `Row ${i + 1}: No email address found. Available fields: ${availableFields}. Values: ${fieldValues}`]);
          continue;
        }

        const personalizedSubject = replacePlaceholders(subject, row);
        const personalizedMessage = replacePlaceholders(message, row);

        // Map email address to user ID (same as MainLayout)
        const recipient = users.find(u => u.email === row.email);
        const recipientId = recipient?.id || row.email;
        
        console.log(`Mail Merge: Recipient for ${row.email} -> ID: ${recipientId}`);

        const emailData = {
          subject: personalizedSubject,
          body: personalizedMessage,
          senderId: user?.id || '',
          recipientIds: [recipientId],
          priority: 'normal' as const
        };
        
        console.log(`Mail Merge: Sending email ${i + 1} with data:`, emailData);

        try {
          await apiClient.addEmail(emailData);
          setSuccessCount(prev => prev + 1);
          console.log(`Mail Merge: Email ${i + 1} sent successfully`);
        } catch (error) {
          console.error(`Mail Merge: Failed to send email ${i + 1}:`, error);
          setErrors(prev => [...prev, `Failed to send email to ${row.email}: ${error instanceof Error ? error.message : 'Unknown error'}`]);
        }

        setSendingProgress(((i + 1) / csvData.length) * 100);
        console.log(`Mail Merge: Progress updated to ${((i + 1) / csvData.length) * 100}%`);
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Mail Merge: Error during email sending process:', error);
      setErrors(prev => [...prev, 'An error occurred while sending emails']);
    }

    console.log('Mail Merge: Process completed. Success count:', successCount, 'Errors:', errors.length);
    setIsSending(false);
  };

  const downloadTemplate = () => {
    const csvContent = 'email,name,company\nexample@email.com,John Doe,Acme Corp\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mail-merge-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Mail Merge</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* CSV Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Upload CSV File
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    CSV file with email addresses and merge data
                  </span>
                </label>
                <input
                  id="csv-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              <div className="mt-4 flex justify-center space-x-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Choose File'}
                </button>
                <button
                  onClick={downloadTemplate}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Template</span>
                </button>
              </div>
            </div>
          </div>

          {/* CSV Data Preview */}
          {csvData.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  CSV loaded successfully: {csvData.length} records
                </span>
              </div>
              <div className="text-sm text-green-700">
                Available fields: {csvHeaders.join(', ')}
              </div>
            </div>
          )}

          {/* Email Composition */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject (use {{fieldname}} for personalization)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                id="message-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your email message (use {{fieldname}} for personalization)"
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Placeholder Buttons */}
            {csvHeaders.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insert Placeholders
                </label>
                <div className="flex flex-wrap gap-2">
                  {csvHeaders.map((header) => (
                    <button
                      key={header}
                      onClick={() => insertPlaceholder(header)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                    >
                      {`{{${header}}}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-800">Errors:</span>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Sending Progress */}
          {isSending && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium text-blue-800">
                  Sending emails... {Math.round(sendingProgress)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${sendingProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successCount > 0 && !isSending && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Successfully sent {successCount} emails!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-4 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSendEmails}
            disabled={isSending || csvData.length === 0 || !subject.trim() || !message.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? 'Sending...' : `Send ${csvData.length} Emails`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MailMerge;