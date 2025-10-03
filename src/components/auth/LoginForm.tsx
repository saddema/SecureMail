import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoginCredentials } from '../../types';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Shield, Users, BarChart3, Paperclip, Send, Settings, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

const LoginForm: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    const success = await login({ email, password });
    if (!success) {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Main Content Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start min-h-[80vh]">
          
          {/* Left Side - Branding and Features */}
          <div className="space-y-8 flex flex-col justify-center h-full">
            {/* Logo and Title */}
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="mx-auto lg:mx-0 w-20 h-20 bg-primary-600 rounded-xl flex items-center justify-center mr-4">
                    <Mail className="w-10 h-10 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold text-gray-900">SecureMail Enterprise</h1>
                </div>
              </div>
              <p className="text-xl text-gray-600 leading-relaxed">
                Advanced internal communication platform with enterprise-grade security and comprehensive features
              </p>
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm font-medium">
                  🔒 <strong>IMPORTANT:</strong> This system can only send/receive emails between internal users. 
                  No external email communication is possible.
                </p>
              </div>
            </div>

            {/* Key Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/30 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center mb-3">
                  <Send className="w-5 h-5 text-primary-600 mr-2" />
                  <h4 className="font-semibold text-gray-900 text-sm">Mail Merge</h4>
                </div>
                <p className="text-xs text-gray-600">Personalized bulk messaging with dynamic content</p>
              </div>
              
              <div className="bg-white/30 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center mb-3">
                  <Users className="w-5 h-5 text-primary-600 mr-2" />
                  <h4 className="font-semibold text-gray-900 text-sm">Role-Based Access</h4>
                </div>
                <p className="text-xs text-gray-600">Granular permissions with audit trails</p>
              </div>
              
              <div className="bg-white/30 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center mb-3">
                  <Paperclip className="w-5 h-5 text-primary-600 mr-2" />
                  <h4 className="font-semibold text-gray-900 text-sm">Attachment Tracking</h4>
                </div>
                <p className="text-xs text-gray-600">Read receipts with secure file handling</p>
              </div>
              
              <div className="bg-white/30 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center mb-3">
                  <BarChart3 className="w-5 h-5 text-primary-600 mr-2" />
                  <h4 className="font-semibold text-gray-900 text-sm">Analytics & Reporting</h4>
                </div>
                <p className="text-xs text-gray-600">Detailed activity reports and insights</p>
              </div>
            </div>

            {/* Internal-Only Warning */}
            <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-start">
                <div className="bg-red-500 p-2 rounded-lg mr-4 mt-1">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-red-800 mb-2">⚠️ INTERNAL-ONLY EMAIL SYSTEM</h3>
                  <div className="text-red-700 space-y-2 text-sm">
                    <p><strong>✅ You CAN:</strong> Send emails only to other users created in this internal system</p>
                    <p><strong>❌ You CANNOT:</strong> Send emails to Gmail, Yahoo, Outlook, or any external email addresses</p>
                    <p><strong>❌ You CANNOT:</strong> Receive emails from external sources (Gmail, Yahoo, etc.)</p>
                    <p><strong>🔒 This system is completely isolated from the internet for maximum security</strong></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Savings Highlight */}
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Cost Savings</h3>
              </div>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Saves ₹16 lakhs yearly for 880+ employees
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Scales from 10 to unlimited users
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Works offline & online seamlessly
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="flex items-center justify-center h-full">
            <div className="card p-8 w-full max-w-md">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Secure Login</h2>
                <p className="text-gray-600">Access your enterprise communication hub</p>
              </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="flex justify-center items-center space-x-4 mb-2">
            <Link 
              to="/how-to-use" 
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              How to Use
            </Link>
            <span className="text-gray-400">•</span>
            <Link 
              to="/features" 
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Features & System Requirements
            </Link>
          </div>
          <p className="text-sm text-gray-600">
            © 2024 SecureMail Enterprise. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;