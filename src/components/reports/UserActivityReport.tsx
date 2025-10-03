import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Download, Calendar, Check, X } from 'lucide-react';
import { apiClient } from '../../utils/api';

interface LoginActivityReport {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  loginByDate: { [date: string]: 'Yes' | 'No' };
}

interface LoginActivityResponse {
  reportData: LoginActivityReport[];
  dates: string[];
  dateRange: { startDate: string; endDate: string };
  totalUsers: number;
}

const UserActivityReport: React.FC = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<LoginActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>('30');

  const dateRangeOptions = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: 'this-month', label: 'This month' },
    { value: 'last-month', label: 'Last month' },
    { value: '90', label: 'Last 90 days' },
    { value: '365', label: 'Last 365 days' }
  ];

  const getDateRange = (range: string): { startDate: Date; endDate: Date } => {
    const endDate = new Date();
    const startDate = new Date();

    // Set end date to end of current day to ensure today is included
    endDate.setHours(23, 59, 59, 999);

    switch (range) {
      case '7':
        startDate.setDate(endDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '30':
        startDate.setDate(endDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '90':
        startDate.setDate(endDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '365':
        startDate.setDate(endDate.getDate() - 365);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'this-month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last-month':
        startDate.setMonth(endDate.getMonth() - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
  };

  const loadActivityReport = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(dateRange);
      
      const response = await apiClient.getUserActivityReport(
        user.id,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      setReportData(response);
    } catch (error) {
      console.error('Error loading activity report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivityReport();
  }, [dateRange, user?.id]);

  const handleDownloadReport = () => {
    if (!reportData) return;

    let csvContent = 'User Name,User Email,User Role,' + reportData.dates.join(',') + '\n';
    
    reportData.reportData.forEach(user => {
      const row = [
        user.userName,
        user.userEmail,
        user.userRole,
        ...reportData.dates.map(date => user.loginByDate[date] || 'No')
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-login-activity-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No activity data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Login Activity Report</h2>
          <p className="text-gray-600 mt-1">
            {reportData.totalUsers} users • {reportData.dates.length} days • 
            {reportData.dateRange.startDate} to {reportData.dateRange.endDate}
          </p>
        </div>
        <button
          onClick={handleDownloadReport}
          className="btn-primary flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Download CSV</span>
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center space-x-4">
        <Calendar className="w-5 h-5 text-gray-500" />
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 bg-white"
        >
          {dateRangeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Activity Grid */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                {reportData.dates.map(date => (
                  <th key={date} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                    {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Login Days
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.reportData.map((user) => {
                const loginDays = Object.values(user.loginByDate).filter(status => status === 'Yes').length;
                return (
                  <tr key={user.userId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                        <div className="text-sm text-gray-500">{user.userEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {user.userRole}
                      </span>
                    </td>
                    {reportData.dates.map(date => (
                      <td key={date} className="px-3 py-4 text-center">
                        {user.loginByDate[date] === 'Yes' ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-red-500 mx-auto" />
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {loginDays}/{reportData.dates.length}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Check className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Report Period</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.dates.length} days</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Check className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Login Days</p>
              <p className="text-2xl font-bold text-gray-900">
                {(reportData.reportData.reduce((sum, user) => 
                  sum + Object.values(user.loginByDate).filter(status => status === 'Yes').length, 0
                ) / reportData.totalUsers).toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserActivityReport;