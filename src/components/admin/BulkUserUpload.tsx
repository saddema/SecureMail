import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X, Users } from 'lucide-react';
import { User } from '../../types';

interface BulkUserUploadProps {
  onUsersCreated: (users: User[]) => void;
  onClose: () => void;
}

interface ParsedUser {
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'manager' | 'team-leader' | 'agent' | 'bde';
  isActive: boolean;
  errors?: string[];
}

interface UploadResult {
  success: ParsedUser[];
  errors: { row: number; user: ParsedUser; errors: string[] }[];
}

const BulkUserUpload: React.FC<BulkUserUploadProps> = ({ onUsersCreated, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUser = (user: any, row: number): ParsedUser => {
    const errors: string[] = [];
    
    if (!user.firstName || typeof user.firstName !== 'string' || user.firstName.trim() === '') {
      errors.push('First name is required');
    }
    
    if (!user.lastName || typeof user.lastName !== 'string' || user.lastName.trim() === '') {
      errors.push('Last name is required');
    }
    
    if (!user.email || typeof user.email !== 'string' || user.email.trim() === '') {
      errors.push('Email is required');
    } else if (!validateEmail(user.email.trim())) {
      errors.push('Invalid email format');
    }
    
    if (!user.role || !['admin', 'manager', 'team-leader', 'agent', 'bde'].includes(user.role)) {
      errors.push('Role must be admin, manager, team-leader, agent, or bde');
    }

    const isActive = user.isActive === undefined ? true : 
                    user.isActive === 'true' || user.isActive === true || user.isActive === 1;

    return {
      firstName: (user.firstName || '').trim(),
      lastName: (user.lastName || '').trim(),
      email: (user.email || '').trim().toLowerCase(),
      role: user.role || 'agent',
      isActive,
      errors: errors.length > 0 ? errors : undefined
    };
  };

  const parseCSV = (csvText: string): UploadResult => {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      return { success: [], errors: [{ row: 0, user: {} as ParsedUser, errors: ['CSV file must contain at least a header row and one data row'] }] };
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['firstname', 'lastname', 'email', 'role'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return { 
        success: [], 
        errors: [{ 
          row: 0, 
          user: {} as ParsedUser, 
          errors: [`Missing required headers: ${missingHeaders.join(', ')}`] 
        }] 
      };
    }

    const success: ParsedUser[] = [];
    const errors: { row: number; user: ParsedUser; errors: string[] }[] = [];
    const emailSet = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const userObj: any = {};
      
      headers.forEach((header, index) => {
        // Map lowercase headers back to camelCase for proper object structure
        let propertyName = header;
        if (header === 'firstname') propertyName = 'firstName';
        if (header === 'lastname') propertyName = 'lastName';
        if (header === 'isactive') propertyName = 'isActive';
        
        userObj[propertyName] = values[index] || '';
      });

      const parsedUser = validateUser(userObj, i + 1);
      
      // Check for duplicate emails within the CSV
      if (parsedUser.email && emailSet.has(parsedUser.email)) {
        parsedUser.errors = parsedUser.errors || [];
        parsedUser.errors.push('Duplicate email in CSV');
      } else if (parsedUser.email) {
        emailSet.add(parsedUser.email);
      }

      if (parsedUser.errors && parsedUser.errors.length > 0) {
        errors.push({ row: i + 1, user: parsedUser, errors: parsedUser.errors });
      } else {
        success.push(parsedUser);
      }
    }

    return { success, errors };
  };

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
    setUploadResult(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const result = parseCSV(text);
      setUploadResult(result);
    } catch (error) {
      alert('Error reading file. Please ensure it\'s a valid CSV file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateUsers = () => {
    if (!uploadResult || uploadResult.success.length === 0) return;

    const newUsers: User[] = uploadResult.success.map(user => ({
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      password: 'temp123', // Default password
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: user.isActive
    }));

    onUsersCreated(newUsers);
    onClose();
  };

  const downloadTemplate = () => {
    const csvContent = 'firstName,lastName,email,role,isActive\nJohn,Doe,john.doe@example.com,agent,true\nJane,Smith,jane.smith@example.com,manager,true';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-primary-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Bulk User Upload</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] no-scrollbar">
          {!uploadResult ? (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Instructions:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Upload a CSV file with user information</li>
                  <li>• Required columns: firstName, lastName, email, role</li>
                  <li>• Optional column: isActive (defaults to true)</li>
                  <li>• Role must be: admin, manager, team-leader, or agent</li>
                  <li>• Maximum file size: 5MB</li>
                  <li>• <strong>Default password for all users: temp123</strong></li>
                </ul>
              </div>

              {/* Password Information */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-amber-900 mb-2">⚠️ Password Information:</h4>
                <p className="text-sm text-amber-800">
                  All bulk uploaded users will be assigned the default password: <strong className="font-mono bg-amber-100 px-2 py-1 rounded">temp123</strong>
                </p>
                <p className="text-xs text-amber-700 mt-2">
                  Users should be instructed to change their password upon first login for security purposes.
                </p>
              </div>

              {/* Template Download */}
              <div className="flex justify-center">
                <button
                  onClick={downloadTemplate}
                  className="btn-secondary flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </button>
              </div>

              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">
                    Drop your CSV file here, or{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary-600 hover:text-primary-700 underline"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-sm text-gray-500">CSV files only, up to 5MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
              </div>

              {/* Selected File */}
              {file && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Results Display */
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Valid Users</p>
                      <p className="text-2xl font-bold text-green-600">{uploadResult.success.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-red-900">Errors</p>
                      <p className="text-2xl font-bold text-red-600">{uploadResult.errors.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {uploadResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-900 mb-3">Errors Found:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                    {uploadResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-800">
                        <strong>Row {error.row}:</strong> {error.errors.join(', ')}
                        {error.user.email && <span className="ml-2 text-red-600">({error.user.email})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid Users Preview */}
              {uploadResult.success.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-900 mb-3">Users to be created:</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar">
                    {uploadResult.success.slice(0, 10).map((user, index) => (
                      <div key={index} className="flex items-center justify-between text-sm text-green-800 bg-white p-2 rounded">
                        <span>{user.firstName} {user.lastName}</span>
                        <span className="text-green-600">{user.email}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          {user.role}
                        </span>
                      </div>
                    ))}
                    {uploadResult.success.length > 10 && (
                      <p className="text-sm text-green-700 text-center">
                        ... and {uploadResult.success.length - 10} more users
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between">
            <button
              onClick={() => {
                setFile(null);
                setUploadResult(null);
              }}
              className="btn-secondary"
              disabled={isProcessing}
            >
              Reset
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="btn-secondary"
                disabled={isProcessing}
              >
                Cancel
              </button>
              
              {!uploadResult ? (
                <button
                  onClick={processFile}
                  disabled={!file || isProcessing}
                  className="btn-primary disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Process File'}
                </button>
              ) : (
                <button
                  onClick={handleCreateUsers}
                  disabled={uploadResult.success.length === 0}
                  className="btn-primary disabled:opacity-50"
                >
                  Create {uploadResult.success.length} Users
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUserUpload;