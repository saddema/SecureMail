import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import InboxView from '../email/InboxView';
import ComposeEmail from '../email/ComposeEmail';
import UserManagement from '../admin/UserManagement';
import MessageLog from '../admin/MessageLog';
import SentEmailsView from '../email/SentEmailsView';
import TrashView from '../email/TrashView';
import ArchiveView from '../email/ArchiveView';
import DistributionListManagement from '../admin/DistributionListManagement';
import ReportsView from '../reports/ReportsView';
import LiveQueue from '../livequeue/LiveQueue';
import { EmailWithSender } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getUsers } from '../../utils/mockData';
import { dbOperations } from '../../utils/database';


const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeMinimized, setComposeMinimized] = useState(false);
  const [replyEmail, setReplyEmail] = useState<EmailWithSender | null>(null);
  const [forwardEmail, setForwardEmail] = useState<EmailWithSender | null>(null);

  const handleSendEmail = async (emailData: {
    to: string[];
    cc: string[];
    subject: string;
    body: string;
    attachments: { name: string; size: number; type: string; filename?: string; originalName?: string }[];
  }) => {
    if (!user) return;
    
    try {
      // Simulate sending email
      console.log('Sending email:', emailData);
      
      // Get users to find recipient IDs
      const users = await getUsers();
      
      // Create new email object
      const newEmail = {
        id: Date.now().toString(),
        senderId: user.id,
        subject: emailData.subject,
        body: emailData.body,
        recipientIds: emailData.to.map(email => {
          const recipient = users.find(u => u.email === email);
          return recipient?.id || email;
        }),
        attachments: emailData.attachments,
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false
      };
      
      // Add to database
      await dbOperations.addEmail(newEmail);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message and redirect to inbox
      alert('Email sent successfully!');
      setActiveView('inbox');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    }
  };

  const handleReply = (email: EmailWithSender) => {
    setReplyEmail(email);
    setForwardEmail(null);
    setShowComposeModal(true);
  };

  const handleForward = (email: EmailWithSender) => {
    setForwardEmail(email);
    setReplyEmail(null);
    setShowComposeModal(true);
  };

  useEffect(() => {
    console.log('MainLayout: activeView changed to:', activeView);
    console.log('MainLayout: Current user role:', user?.role);
  }, [activeView, user?.role]);

  const renderContent = () => {
    console.log('Rendering content for view:', activeView);
    switch (activeView) {
      case 'inbox':
        return <InboxView searchQuery={searchQuery} onReply={handleReply} onForward={handleForward} />;
      case 'user-management':
        return <UserManagement />;
      case 'message-log':
        return <MessageLog />;
      case 'distribution-lists':
        return <DistributionListManagement />;
      case 'sent-emails':
        return <SentEmailsView />;
      case 'reports':
        return <ReportsView />;
      case 'live-queue':
        return <LiveQueue />;
      case 'starred':
        return <div className="p-6"><h2 className="text-xl font-semibold">Starred Emails</h2><p className="text-gray-600 mt-2">Feature coming soon...</p></div>;
      case 'archive':
        return (
          <ArchiveView
            onReply={handleReply}
            onForward={handleForward}
          />
        );
      case 'trash':
        return <TrashView currentUserId={user?.id || ''} />;
      default:
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Welcome to Ketto Internal Email System</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView}
        onCompose={() => setShowComposeModal(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <TopBar 
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
          activeView={activeView}
        />
        
        <main className="flex-1 overflow-y-auto no-scrollbar">
          {renderContent()}
        </main>
      </div>

      {/* Compose Email Modal */}
      {showComposeModal && (
        <ComposeEmail
          onClose={() => {
            setShowComposeModal(false);
            setComposeMinimized(false);
            setReplyEmail(null);
            setForwardEmail(null);
          }}
          onSend={handleSendEmail}
          isMinimized={composeMinimized}
          onToggleMinimize={() => setComposeMinimized(!composeMinimized)}
          replyTo={replyEmail}
          forwardEmail={forwardEmail}
        />
      )}
    </div>
  );
};

export default MainLayout;