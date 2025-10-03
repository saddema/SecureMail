import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Mail, 
  Users, 
  BarChart3, 
  Paperclip, 
  Send, 
  Settings, 
  Shield, 
  Database, 
  Globe, 
  Wifi, 
  WifiOff,
  DollarSign,
  TrendingUp,
  Award,
  Code,
  Briefcase,
  Linkedin,
  ArrowLeft
} from 'lucide-react';

const Features: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">SecureMail Internal</h1>
            </div>
            <Link 
              to="/login" 
              className="flex items-center text-primary-600 hover:text-primary-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Complete Internal-Only Email Communication Solution
            </h1>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              SecureMail Internal is a comprehensive <strong>internal-only</strong> email communication platform designed to 
              revolutionize enterprise communication. This application works entirely offline on localhost 
              or online, providing complete flexibility for your organization. <strong>All emails stay strictly within your organization—no external email integration possible.</strong>
            </p>
            <div className="mt-8 space-y-4 max-w-4xl mx-auto text-left">
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <p className="font-semibold text-red-800 mb-2">🚫 NO EXTERNAL SENDING POSSIBLE</p>
                <p className="text-red-700 mb-2">
                  <strong>You CANNOT send emails to Gmail, Yahoo, Outlook, or any external email addresses.</strong> This system only works for internal communication between users created within this application.
                </p>
                <p className="text-red-600 text-sm">
                  Example: You cannot send an email to someone@example.com or any external domain. You can only email other users who have accounts in this internal system.
                </p>
              </div>
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
                <p className="font-semibold text-orange-800 mb-2">📧 INTERNAL SENDING ONLY</p>
                <p className="text-orange-700 mb-2">
                  You can only send emails to other users who are registered in this internal system by your administrator.
                </p>
                <p className="text-orange-600 text-sm">
                  Example: If User A and User B are created in this system, they can email each other. But they cannot email anyone outside this system.
                </p>
              </div>
              <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
                <p className="font-semibold text-purple-800 mb-2">🚫 NO EXTERNAL RECEIVING</p>
                <p className="text-purple-700 mb-2">
                  <strong>This system cannot receive emails from external sources.</strong> Emails from Gmail, Yahoo, Outlook, or any external service will never reach this system.
                </p>
                <p className="text-purple-600 text-sm">
                  Example: If someone from outside sends an email to your internal email address, it will NOT be delivered to this system. This is completely isolated from the internet.
                </p>
              </div>
              <div className="bg-green-50 border-l-4 border-green-400 p-4">
                <p className="font-semibold text-green-800 mb-2">🛡️ Enhanced Security</p>
                <p className="text-green-700">
                  By operating in complete isolation from external email systems, this application eliminates the risk of 
                  external hacking attempts, phishing attacks, or unauthorized access to sensitive organizational information.
                </p>
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <p className="font-semibold text-blue-800 mb-2">⚡ Offline/Online Capability</p>
                <p className="text-blue-700">
                  The system operates both offline and online, ensuring seamless internal communication even during network 
                  disruptions. All internal emails remain accessible and functional regardless of external connectivity.
                </p>
              </div>
            </div>
          </div>

        {/* Cost Savings Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Massive Cost Savings & Security
            </h2>
            <p className="text-lg text-gray-600">
                Designed to save approximately ₹16 lakhs yearly for an employee base of around 880 users while ensuring complete internal security
              </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-green-50 rounded-xl">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Scalable Architecture</h3>
              <p className="text-gray-600">Works efficiently from 10 users to unlimited scale</p>
            </div>
            
            <div className="text-center p-6 bg-blue-50 rounded-xl">
              <Globe className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Offline Capability</h3>
              <p className="text-gray-600">Complete offline functionality on localhost</p>
            </div>
            
            <div className="text-center p-6 bg-purple-50 rounded-xl">
              <Award className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enterprise Ready</h3>
              <p className="text-gray-600">Built for enterprise-level requirements</p>
            </div>
          </div>
        </div>

        {/* Core Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Core Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Mail Merge */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Send className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Advanced Mail Merge</h3>
              <p className="text-gray-600 mb-4">
                Create personalized bulk emails with dynamic content, custom fields, and recipient-specific 
                information. Perfect for announcements, newsletters, and targeted communications.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Dynamic content insertion</li>
                <li>• Custom field mapping</li>
                <li>• Template management</li>
                <li>• Delivery tracking</li>
              </ul>
            </div>

            {/* Role-Based Access */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Role-Based Access Control</h3>
              <p className="text-gray-600 mb-4">
                Granular permission system with comprehensive audit trails. Define user roles, permissions, 
                and access levels with complete security and compliance tracking.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Custom role definitions</li>
                <li>• Permission inheritance</li>
                <li>• Audit trail logging</li>
                <li>• Access level management</li>
              </ul>
            </div>

            {/* Attachment Tracking */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Paperclip className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure Attachment Management</h3>
              <p className="text-gray-600 mb-4">
                Advanced file handling with read receipts, secure storage, and comprehensive tracking. 
                Know exactly when attachments are accessed and by whom.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Read receipt tracking</li>
                <li>• Secure file storage</li>
                <li>• Access monitoring</li>
                <li>• File version control</li>
              </ul>
            </div>

            {/* Analytics & Reporting */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Analytics & Reporting</h3>
              <p className="text-gray-600 mb-4">
                Detailed activity reports, email metrics, user engagement analytics, and comprehensive 
                insights into your organization's communication patterns.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Email delivery metrics</li>
                <li>• User engagement analytics</li>
                <li>• Communication patterns</li>
                <li>• Custom report generation</li>
              </ul>
            </div>

            {/* Admin Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Admin Dashboard</h3>
              <p className="text-gray-600 mb-4">
                Comprehensive administrative controls for user management, system configuration, 
                monitoring, and maintenance of the entire email communication platform.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• User management panel</li>
                <li>• System configuration</li>
                <li>• Performance monitoring</li>
                <li>• Backup & recovery</li>
              </ul>
            </div>

            {/* Email Management */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Complete Email Management</h3>
              <p className="text-gray-600 mb-4">
                Full-featured email system with compose, send, receive, archive, trash, and permanent 
                deletion capabilities. Supports rich text formatting and multimedia content.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Rich text composition</li>
                <li>• Multi-recipient support</li>
                <li>• Archive & organization</li>
                <li>• Permanent deletion</li>
              </ul>
            </div>
          </div>
        </div>

        {/* System Requirements */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">System Requirements</h2>
            <p className="text-lg text-gray-600">
              Everything you need to run SecureMail Enterprise
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">Server Requirements</h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Database</h4>
                <p className="text-gray-600">MongoDB (Latest stable version)</p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Document-based NoSQL database</li>
                  <li>• High performance and scalability</li>
                  <li>• Automatic sharding support</li>
                  <li>• Built-in replication capabilities</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Runtime Environment</h4>
                <p className="text-gray-600">Node.js (v16+ recommended)</p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• JavaScript runtime environment</li>
                  <li>• NPM package manager included</li>
                  <li>• Cross-platform compatibility</li>
                  <li>• High-performance V8 engine</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Web Server</h4>
                <p className="text-gray-600">Express.js (Built-in)</p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Fast, unopinionated web framework</li>
                  <li>• Robust routing capabilities</li>
                  <li>• Middleware support</li>
                  <li>• RESTful API development</li>
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">Frontend Requirements</h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Framework</h4>
                <p className="text-gray-600">React 18+ with TypeScript</p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Component-based architecture</li>
                  <li>• Type safety with TypeScript</li>
                  <li>• Virtual DOM for performance</li>
                  <li>• Rich ecosystem of libraries</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Build Tool</h4>
                <p className="text-gray-600">Vite (Ultra-fast build tool)</p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Lightning-fast HMR (Hot Module Replacement)</li>
                  <li>• Optimized production builds</li>
                  <li>• TypeScript support out-of-the-box</li>
                  <li>• Rich plugin ecosystem</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Styling</h4>
                <p className="text-gray-600">Tailwind CSS + PostCSS</p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Utility-first CSS framework</li>
                  <li>• Responsive design utilities</li>
                  <li>• Custom component creation</li>
                  <li>• Optimized for production</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 p-6 bg-green-50 rounded-xl">
            <div className="flex items-center mb-3">
              <Wifi className="w-6 h-6 text-green-600 mr-3" />
              <h4 className="text-lg font-semibold text-gray-900">Offline Capability</h4>
            </div>
            <p className="text-gray-600 mb-3">
              The application is designed to work completely offline on localhost, making it perfect for:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Secure internal networks</li>
              <li>• Limited internet connectivity environments</li>
              <li>• Development and testing purposes</li>
              <li>• Backup communication system</li>
            </ul>
          </div>
        </div>

        {/* Creator Information */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Code className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Created by Sumit Roy</h2>
            <p className="text-xl text-blue-100 mb-6">
                Associate Director - Telecalling & Digital Sales | Vibe Coder
              </p>
            <p className="text-lg text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                Sumit Roy is a business technology leader with extensive experience in digital sales, 
                telecalling operations, and enterprise communication systems. He has successfully led 
                digital transformation initiatives at leading financial companies including Ketto, AngelOne, 
                5Paisa Capital, and Upstox, bringing deep expertise in building scalable business 
                communication solutions that drive operational efficiency and cost savings.
              </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">Professional Background</h3>
              
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Briefcase className="w-5 h-5 mr-3" />
                  <h4 className="font-semibold">Associate Director - Telecalling & Digital Sales</h4>
                </div>
                <p className="text-blue-100">@Ketto</p>
              </div>

              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Expertise Areas</h4>
                <ul className="text-sm text-blue-100 space-y-1">
                  <li>• Crowdfunding & Fintech Solutions</li>
                  <li>• Digital Sales Strategy</li>
                  <li>• Telecalling Operations</li>
                  <li>• Team Leadership & Management</li>
                </ul>
              </div>

              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Previous Experience</h4>
                <ul className="text-sm text-blue-100 space-y-1">
                  <li>• AngelOne - Financial Services</li>
                  <li>• 5Paisa Capital - Investment Platform</li>
                  <li>• Upstox - Stock Trading Platform</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">Connect & Follow</h3>
              
              <a 
                href="https://www.linkedin.com/in/sumit-roy-0072a417b/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white bg-opacity-10 hover:bg-opacity-20 rounded-lg p-4 flex items-center transition-all"
              >
                <Linkedin className="w-6 h-6 mr-3" />
                <div>
                  <h4 className="font-semibold">LinkedIn Profile</h4>
                  <p className="text-sm text-blue-100">Connect for professional networking</p>
                </div>
              </a>

              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Award className="w-5 h-5 mr-3" />
                  <h4 className="font-semibold">Vibe Coder</h4>
                </div>
                <p className="text-sm text-blue-100">
                  Passionate about creating innovative solutions that solve real-world problems 
                  and drive business value through technology.
                </p>
              </div>

              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <h4 className="font-semibold mb-2">About This Project</h4>
                <p className="text-sm text-blue-100">
                  Built with modern web technologies to provide a cost-effective, scalable, 
                  and secure email communication solution for enterprises of all sizes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;