import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dbOperations } from '../../utils/database';
import { User, Email } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FileText, Users, Mail, TrendingUp, Calendar, Download, Filter, UserCheck, BarChart3, Eye, Activity } from 'lucide-react';
import UserActivityReport from './UserActivityReport';

interface ReportData {
  totalUsers: number;
  activeUsers: number;
  totalEmails: number;
  emailsThisMonth: number;
  emailOpenRate: number;
  emailsByDepartment: { name: string; value: number }[];
  userActivityByRole: { role: string; active: number; inactive: number }[];
  emailTrend: { month: string; sent: number; received: number }[];
  topSenders: { name: string; email: string; count: number }[];
  recentActivity: { user: string; action: string; timestamp: Date }[];
}

const ReportsView: React.FC = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'userActivity'>('overview');

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  useEffect(() => {
    const loadReportData = async () => {
      try {
        setLoading(true);
        
        // Get all users and emails (admin view for analytics)
        const users = await dbOperations.getUsers();
        const emails = user?.role === 'admin' || user?.role === 'manager' 
          ? await dbOperations.getAllEmailsForAdmin(user.id)
          : await dbOperations.getEmails();
        
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(dateRange));
        
        // Filter emails by date range
        const filteredEmails = emails.filter(email => 
          new Date(email.sentAt || email.createdAt) >= startDate
        );
        
        // Calculate statistics
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.isActive).length;
        const totalEmails = filteredEmails.length;
        
        // Calculate email open rate for entire web app
        const emailReads = await dbOperations.getEmailReads();
        
        // Only count reads for emails within the filtered date range
        const filteredEmailIds = new Set(filteredEmails.map(email => email.id));
        const relevantReads = emailReads.filter(read => filteredEmailIds.has(read.emailId));
        
        // Count unique user-email combinations (to avoid counting multiple reads by same user)
        const uniqueReads = new Set(relevantReads.map(read => `${read.emailId}-${read.userId}`)).size;
        
        const totalRecipients = filteredEmails.reduce((total, email) => total + (email.recipientIds?.length || 0), 0);
        const emailOpenRate = totalRecipients > 0 ? (uniqueReads / totalRecipients) * 100 : 0;
        
        // Emails by department
        const emailsByDepartment: { [key: string]: number } = {};
        filteredEmails.forEach(email => {
          // Find sender's department
          const sender = users.find(u => u.id === email.senderId);
          if (sender && sender.department) {
            emailsByDepartment[sender.department] = (emailsByDepartment[sender.department] || 0) + 1;
          }
        });
        
        const departmentData = Object.entries(emailsByDepartment)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);
        
        // User activity by role
        const userActivityByRole: { [key: string]: { active: number; inactive: number } } = {};
        users.forEach(user => {
          if (!userActivityByRole[user.role]) {
            userActivityByRole[user.role] = { active: 0, inactive: 0 };
          }
          if (user.isActive) {
            userActivityByRole[user.role].active++;
          } else {
            userActivityByRole[user.role].inactive++;
          }
        });
        
        const roleActivityData = Object.entries(userActivityByRole)
          .map(([role, data]) => ({ role: role.charAt(0).toUpperCase() + role.slice(1), ...data }));
        
        // Email trend (last 6 months)
        const emailTrend: { month: string; sent: number; received: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = new Date();
          monthDate.setMonth(monthDate.getMonth() - i);
          const monthName = monthDate.toLocaleString('default', { month: 'short' });
          
          const monthEmails = emails.filter(email => {
            const emailDate = new Date(email.sentAt || email.createdAt);
            return emailDate.getMonth() === monthDate.getMonth() && 
                   emailDate.getFullYear() === monthDate.getFullYear();
          });
          
          // For system-wide view: sent = total emails, received = total emails (since every sent email is received by someone)
          const sent = monthEmails.length;
          const received = monthEmails.reduce((total, email) => total + (email.recipientIds?.length || 0), 0);
          
          emailTrend.push({ month: monthName, sent, received });
        }
        
        // Top senders
        const senderCounts: { [key: string]: number } = {};
        filteredEmails.forEach(email => {
          senderCounts[email.senderId] = (senderCounts[email.senderId] || 0) + 1;
        });
        
        const topSenders = Object.entries(senderCounts)
          .map(([userId, count]) => {
            const sender = users.find(u => u.id === userId);
            return {
              name: sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown',
              email: sender?.email || 'unknown@example.com',
              count
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        setReportData({
          totalUsers,
          activeUsers,
          totalEmails,
          emailsThisMonth: emails.filter(email => {
            const emailDate = new Date(email.sentAt || email.createdAt);
            const now = new Date();
            return emailDate.getMonth() === now.getMonth() && 
                   emailDate.getFullYear() === now.getFullYear();
          }).length,
          emailOpenRate,
          emailsByDepartment: departmentData,
          userActivityByRole: roleActivityData,
          emailTrend,
          topSenders,
          recentActivity: [] // This would need a separate activity log implementation
        });
        
      } catch (error) {
        console.error('Error loading report data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [dateRange, user?.id]);

  const handleExportReport = () => {
    if (!reportData) return;
    
    const reportContent = `
Ketto Email System - Usage Report
Generated on: ${new Date().toLocaleDateString()}
Date Range: Last ${dateRange} days

=== SUMMARY STATISTICS ===
Total Users: ${reportData.totalUsers}
Active Users: ${reportData.activeUsers}
Total Emails: ${reportData.totalEmails}
Emails This Month: ${reportData.emailsThisMonth}

=== EMAILS BY DEPARTMENT ===
${reportData.emailsByDepartment.map(dept => `${dept.name}: ${dept.value} emails`).join('\n')}

=== USER ACTIVITY BY ROLE ===
${reportData.userActivityByRole.map(role => `${role.role}: ${role.active} active, ${role.inactive} inactive`).join('\n')}

=== TOP SENDERS ===
${reportData.topSenders.map(sender => `${sender.name} (${sender.email}): ${sender.count} emails`).join('\n')}
    `.trim();
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Failed to load report data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Email system usage and user activity reports</p>
        </div>
        <div className="flex items-center space-x-4">
          {activeTab === 'overview' && (
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input-field w-40"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          )}
          <button
            onClick={handleExportReport}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('userActivity')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'userActivity'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>User Activity</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Report Content */}
      {activeTab === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600">Total Users</p>
                  <p className="text-lg font-bold text-gray-900">{reportData.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600">Active Users</p>
                  <p className="text-lg font-bold text-gray-900">{reportData.activeUsers}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {((reportData.activeUsers / reportData.totalUsers) * 100).toFixed(1)}% of total
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600">Total Emails</p>
                  <p className="text-lg font-bold text-gray-900">{reportData.totalEmails}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Eye className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600">Email Open Rate</p>
                  <p className="text-lg font-bold text-gray-900">{reportData.emailOpenRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 mt-1">of all emails opened</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600">This Month</p>
                  <p className="text-lg font-bold text-gray-900">{reportData.emailsThisMonth}</p>
                  <p className="text-xs text-gray-500 mt-1">emails sent</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Emails by Department */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Emails by Department</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.emailsByDepartment}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reportData.emailsByDepartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Active Users by Role */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Number of Active Users by Role</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.userActivityByRole}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="role" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="active" fill="#10B981" name="Active" />
                  <Bar dataKey="inactive" fill="#EF4444" name="Inactive" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Email Activity Trend - Entire Web App */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Activity Trend - Entire Web App</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.emailTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sent" stroke="#3B82F6" name="Sent" strokeWidth={2} />
                <Line type="monotone" dataKey="received" stroke="#10B981" name="Received" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Senders */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Email Senders</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Emails Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.topSenders.map((sender, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-900">{sender.name}</td>
                      <td className="py-3 px-4 text-gray-600">{sender.email}</td>
                      <td className="py-3 px-4">
                        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
                          {sender.count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'userActivity' && (
        <UserActivityReport />
      )}
    </div>
  );
};

export default ReportsView;