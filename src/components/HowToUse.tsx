import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Users, 
  Shield, 
  Settings, 
  FileText, 
  Send, 
  Archive, 
  Trash2, 
  Eye,
  Paperclip,
  BarChart3,
  LogIn,
  Key,
  Bell,
  Download
} from 'lucide-react';

const HowToUse: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="flex items-center text-primary-600 hover:text-primary-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">How to Use SecureMail Enterprise</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Introduction */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
              <Mail className="w-6 h-6 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Getting Started</h2>
          </div>
          <p className="text-gray-600 text-lg leading-relaxed mb-4">
            Welcome to SecureMail Enterprise - your secure internal email communication platform. 
            This guide will help you understand how to use all features effectively.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 font-medium">
              <strong>⚠️ Important:</strong> This system is internal-only. You can only communicate with other users 
              registered in this system. No external email sending or receiving is possible.
            </p>
          </div>
        </div>

        {/* User Roles Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">User Roles & Permissions</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Admin Role */}
            <div className="border border-red-200 bg-red-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Shield className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-lg font-semibold text-red-800">Admin (Full Control)</h3>
              </div>
              <ul className="text-red-700 space-y-2 text-sm">
                <li>• Create, edit, delete user accounts</li>
                <li>• Reset passwords for any user</li>
                <li>• Configure attachment access</li>
                <li>• View all reports and analytics</li>
                <li>• Monitor all email activity</li>
                <li>• Create distribution lists</li>
                <li>• Compose and send emails</li>
                <li>• Use mail merge functionality</li>
                <li>• View live user queue</li>
              </ul>
            </div>

            {/* Manager Role */}
            <div className="border border-orange-200 bg-orange-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Settings className="w-5 h-5 text-orange-600 mr-2" />
                <h3 className="text-lg font-semibold text-orange-800">Manager (Most Privileges)</h3>
              </div>
              <ul className="text-orange-700 space-y-2 text-sm">
                <li>• All admin features except user management</li>
                <li>• Cannot create/delete user accounts</li>
                <li>• Cannot reset other users' passwords</li>
                <li>• Cannot access message logs</li>
                <li>• Full email functionality</li>
                <li>• Access to reports and analytics</li>
                <li>• View live user queue</li>
              </ul>
            </div>

            {/* BDE Role */}
            <div className="border border-green-200 bg-green-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Send className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-green-800">BDE (Business Development Executive)</h3>
              </div>
              <ul className="text-green-700 space-y-2 text-sm">
                <li>• Send and receive emails</li>
                <li>• Add attachments to emails</li>
                <li>• Use mail merge functionality</li>
                <li>• Archive emails</li>
                <li>• Bulk operations on emails</li>
                <li>• Change own password</li>
              </ul>
            </div>

            {/* Agent Role */}
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Eye className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-blue-800">Agent (Read-Only)</h3>
              </div>
              <ul className="text-blue-700 space-y-2 text-sm">
                <li>• Receive emails only</li>
                <li>• Cannot send or reply to emails</li>
                <li>• Archive received emails</li>
                <li>• Bulk operations on received emails</li>
                <li>• Change own password</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Email Management */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Email Management</h2>
          </div>

          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Send className="w-5 h-5 mr-2 text-gray-600" />
                Sending Emails
              </h3>
              <ol className="text-gray-700 space-y-2 text-sm list-decimal list-inside">
                <li>Click "Compose" button in your dashboard</li>
                <li>Add recipients (only internal users appear in suggestions)</li>
                <li>Write your subject and message</li>
                <li>Add attachments if needed (based on your role permissions)</li>
                <li>Click "Send" to deliver the email</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Archive className="w-5 h-5 mr-2 text-gray-600" />
                Archiving Emails
              </h3>
              <p className="text-gray-700 text-sm mb-3">
                All users can archive emails to keep their inbox organized:
              </p>
              <ul className="text-gray-700 space-y-1 text-sm list-disc list-inside">
                <li>Select emails using checkboxes</li>
                <li>Click "Archive" button for bulk archiving</li>
                <li>Archived emails move to the Archive folder</li>
                <li>Access archived emails anytime from the sidebar</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Trash2 className="w-5 h-5 mr-2 text-gray-600" />
                Deleting Emails
              </h3>
              <p className="text-gray-700 text-sm mb-3">
                Deleted emails go to Trash first, then can be permanently deleted:
              </p>
              <ul className="text-gray-700 space-y-1 text-sm list-disc list-inside">
                <li>Delete emails to move them to Trash folder</li>
                <li>Emails in Trash can be restored</li>
                <li>Empty Trash to permanently delete emails</li>
                <li>Permanent deletion cannot be undone</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bulk Operations */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Bulk Operations</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Bulk Actions</h3>
              <ul className="text-gray-700 space-y-2 text-sm list-disc list-inside">
                <li>Mark multiple emails as read/unread</li>
                <li>Archive multiple emails at once</li>
                <li>Delete multiple emails simultaneously</li>
                <li>Move emails between folders</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Use Bulk Operations</h3>
              <ol className="text-gray-700 space-y-2 text-sm list-decimal list-inside">
                <li>Select emails using checkboxes</li>
                <li>Choose action from bulk operations menu</li>
                <li>Confirm the action when prompted</li>
                <li>Selected emails will be processed together</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
              <Bell className="w-6 h-6 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Browser Notifications</h3>
            <p className="text-gray-700 text-sm mb-4">
              Enable browser notifications to receive alerts when new emails arrive:
            </p>
            <ol className="text-gray-700 space-y-2 text-sm list-decimal list-inside">
              <li>Click on your profile/settings</li>
              <li>Find "Notifications" section</li>
              <li>Enable browser notifications</li>
              <li>Allow notifications in browser popup</li>
              <li>You'll receive alerts for new emails</li>
            </ol>
          </div>
        </div>

        {/* Password Management */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
              <Key className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Password Management</h2>
          </div>

          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Passwords</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-amber-800 font-medium">
                  New users created by admin receive default password: <strong>temp123</strong>
                </p>
              </div>
              <p className="text-gray-700 text-sm">
                Users should change their password immediately after first login for security.
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Changing Your Password</h3>
              <ol className="text-gray-700 space-y-2 text-sm list-decimal list-inside">
                <li>Login to your account</li>
                <li>Go to profile/settings</li>
                <li>Find "Change Password" option</li>
                <li>Enter current and new password</li>
                <li>Save changes</li>
              </ol>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Password Reset</h3>
              <p className="text-gray-700 text-sm mb-3">
                Admins can reset any user's password:
              </p>
              <ul className="text-gray-700 space-y-1 text-sm list-disc list-inside">
                <li>Go to User Management</li>
                <li>Find the user</li>
                <li>Click "Reset Password"</li>
                <li>User will receive new password: <strong>temp123</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Reports and Analytics */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Reports</h3>
              <ul className="text-gray-700 space-y-2 text-sm list-disc list-inside">
                <li>User Activity Reports (Admin/Manager only)</li>
                <li>Email usage statistics</li>
                <li>Department-wise email breakdown</li>
                <li>Top senders and activity metrics</li>
                <li>Live user queue (Admin/Manager only)</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Accessing Reports</h3>
              <ol className="text-gray-700 space-y-2 text-sm list-decimal list-inside">
                <li>Login as Admin or Manager</li>
                <li>Navigate to Reports section</li>
                <li>Select report type and date range</li>
                <li>View results or export as needed</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <Download className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Quick Tips</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Best Practices</h3>
              <ul className="text-gray-700 space-y-2 text-sm list-disc list-inside">
                <li>Archive old emails regularly</li>
                <li>Use descriptive subject lines</li>
                <li>Enable notifications for important emails</li>
                <li>Change default password immediately</li>
                <li>Use mail merge for bulk communications</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Security Reminders</h3>
              <ul className="text-gray-700 space-y-2 text-sm list-disc list-inside">
                <li>Never share your password</li>
                <li>Log out when finished</li>
                <li>Report suspicious activity to admin</li>
                <li>Keep your profile information updated</li>
                <li>Use strong, unique passwords</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-gray-600">
              Need help? Contact your system administrator for assistance.
            </p>
            <div className="mt-4">
              <Link 
                to="/" 
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Return to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToUse;