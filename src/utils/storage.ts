import { User, Email } from '../types';

// Storage keys
const STORAGE_KEYS = {
  USERS: 'internal_email_app_users',
  EMAILS: 'internal_email_app_emails',
  EMAIL_READS: 'internal_email_app_email_reads'
} as const;

// User Storage Functions
export const getUsersFromStorage = (): User[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!stored) return getDefaultUsers();
    
    const users = JSON.parse(stored);
    // Convert date strings back to Date objects
    return users.map((user: any) => ({
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt)
    }));
  } catch (error) {
    console.error('Error loading users from storage:', error);
    return getDefaultUsers();
  }
};

export const saveUsersToStorage = (users: User[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users to storage:', error);
  }
};

export const addUserToStorage = (user: User): void => {
  const users = getUsersFromStorage();
  users.push(user);
  saveUsersToStorage(users);
};

export const updateUserInStorage = (updatedUser: User): void => {
  const users = getUsersFromStorage();
  const index = users.findIndex(user => user.id === updatedUser.id);
  if (index !== -1) {
    users[index] = updatedUser;
    saveUsersToStorage(users);
  }
};

export const deleteUserFromStorage = (userId: string): void => {
  const users = getUsersFromStorage();
  const filteredUsers = users.filter(user => user.id !== userId);
  saveUsersToStorage(filteredUsers);
};

// Email Storage Functions
export const getEmailsFromStorage = (): Email[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.EMAILS);
    if (!stored) return getDefaultEmails();
    
    const emails = JSON.parse(stored);
    // Convert date strings back to Date objects
    return emails.map((email: any) => ({
      ...email,
      createdAt: new Date(email.createdAt),
      updatedAt: new Date(email.updatedAt),
      sentAt: new Date(email.sentAt)
    }));
  } catch (error) {
    console.error('Error loading emails from storage:', error);
    return getDefaultEmails();
  }
};

export const saveEmailsToStorage = (emails: Email[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify(emails));
  } catch (error) {
    console.error('Error saving emails to storage:', error);
  }
};

export const addEmailToStorage = (email: Email): void => {
  const emails = getEmailsFromStorage();
  emails.push(email);
  saveEmailsToStorage(emails);
};

// Email Reads Storage Functions
export const getEmailReadsFromStorage = (): Record<string, string[]> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.EMAIL_READS);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error loading email reads from storage:', error);
    return {};
  }
};

export const saveEmailReadsToStorage = (emailReads: Record<string, string[]>): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.EMAIL_READS, JSON.stringify(emailReads));
  } catch (error) {
    console.error('Error saving email reads to storage:', error);
  }
};

// Initialize storage with default data if empty
export const initializeStorage = (): void => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    saveUsersToStorage(getDefaultUsers());
  }
  if (!localStorage.getItem(STORAGE_KEYS.EMAILS)) {
    saveEmailsToStorage(getDefaultEmails());
  }
  if (!localStorage.getItem(STORAGE_KEYS.EMAIL_READS)) {
    saveEmailReadsToStorage({});
  }
};

// Clear all storage (for development/testing)
export const clearAllStorage = (): void => {
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.EMAILS);
  localStorage.removeItem(STORAGE_KEYS.EMAIL_READS);
};

// Default data functions
const getDefaultUsers = (): User[] => [
  {
    id: 'admin-1',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@ketto.com',
    role: 'admin',
    password: 'admin123',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'manager-1',
    firstName: 'Manager',
    lastName: 'User',
    email: 'manager@ketto.com',
    role: 'manager',
    password: 'manager123',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'agent-1',
    firstName: 'Agent',
    lastName: 'User',
    email: 'agent@ketto.com',
    role: 'agent',
    password: 'agent123',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

const getDefaultEmails = (): Email[] => [
  {
    id: 'email-1',
    senderId: 'admin-1',
    subject: 'Welcome to Ketto Internal Email System',
    body: 'This is a welcome message to get you started with our internal email system.',
    recipientIds: ['manager-1', 'agent-1'],
    ccRecipientIds: [],
    attachments: [],
    createdAt: new Date('2024-01-15T10:00:00'),
    updatedAt: new Date('2024-01-15T10:00:00'),
    isDeleted: false,
    sentAt: new Date('2024-01-15T10:00:00')
  },
  {
    id: 'email-2',
    senderId: 'manager-1',
    subject: 'Monthly Team Meeting',
    body: 'Please join us for the monthly team meeting this Friday at 3 PM in the conference room.',
    recipientIds: ['agent-1'],
    ccRecipientIds: [],
    attachments: [],
    createdAt: new Date('2024-01-16T14:30:00'),
    updatedAt: new Date('2024-01-16T14:30:00'),
    isDeleted: false,
    sentAt: new Date('2024-01-16T14:30:00')
  }
];