const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5050;

// Environment-aware logging helpers
const isDev = process.env.NODE_ENV !== 'production';
const debugEnabled = (process.env.DEBUG || '').toLowerCase() === 'true' || isDev;
const logDebug = (...args) => { if (debugEnabled) console.log(...args); };

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept all file types for now - you can add restrictions here
    cb(null, true);
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// File upload endpoint
app.post('/api/upload-attachments', upload.array('attachments'), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      filename: file.filename,
      originalName: file.originalname
    }));

    res.json({ 
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// File download endpoint
app.get('/api/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const originalName = req.query.originalName || filename; // Get original name from query param
    const filePath = path.join(uploadsDir, filename);
    
    // Security check: ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get file info to determine content type
    const fileInfo = fs.statSync(filePath);
    const ext = path.extname(originalName).toLowerCase(); // Use original name for content type
    
    // Set appropriate content type based on extension
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif'
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileInfo.size);
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`); // Use original name for download
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ error: 'File download failed' });
  }
});

// Request logging middleware
app.use((req, res, next) => {
  logDebug(`[Request] ${req.method} ${req.url}`);
  next();
});



// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/internal-email-app';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'team-leader', 'agent', 'bde'], required: true, default: 'agent' },
  department: { type: String },
  isActive: { type: Boolean, default: true },
  avatar: { type: String },
  canSendAttachments: { type: Boolean, default: true }, // New field for attachment permissions
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Email Schema
const emailSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  senderId: { type: String, required: true },
  recipientIds: [{ type: String, required: true }],
  ccRecipients: [{ type: String }],
  bccRecipients: [{ type: String }],
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  attachments: [{
    name: { type: String, required: true },
    size: { type: Number, required: true },
    type: { type: String, required: true },
    filename: { type: String, required: true }, // Stored filename on disk
    originalName: { type: String, required: true } // Original filename for download
  }],
  sentAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
});

// Email Read Schema
const emailReadSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  emailId: { type: String, required: true },
  userId: { type: String, required: true },
  readAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Create indexes for better performance
emailReadSchema.index({ emailId: 1, userId: 1 }, { unique: true });

// Email Deletion Schema - Track user-specific email deletions
const emailDeletionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  emailId: { type: String, required: true },
  userId: { type: String, required: true },
  deletedAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Create indexes for better performance
emailDeletionSchema.index({ emailId: 1, userId: 1 }, { unique: true });

// Email Archive Schema - Track user-specific email archives
const emailArchiveSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  emailId: { type: String, required: true },
  userId: { type: String, required: true },
  archivedAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Create indexes for better performance
emailArchiveSchema.index({ emailId: 1, userId: 1 }, { unique: true });

// Permanent Email Deletion Schema - Track user-specific permanent deletions
const permanentEmailDeletionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  emailId: { type: String, required: true },
  userId: { type: String, required: true },
  permanentlyDeletedAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Create indexes for better performance
permanentEmailDeletionSchema.index({ emailId: 1, userId: 1 }, { unique: true });

// Distribution List Schema
const distributionListSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  members: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true }
  }],
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Active Session Schema for tracking logged-in users
const activeSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  userRole: { type: String, required: true },
  userDepartment: { type: String },
  socketId: { type: String },
  loginTime: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

// Login History Schema for tracking user login/logout events
const loginHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  userRole: { type: String, required: true },
  userDepartment: { type: String },
  loginTime: { type: Date, default: Date.now },
  logoutTime: { type: Date },
  ipAddress: { type: String },
  userAgent: { type: String },
  isManualEntry: { type: Boolean, default: false },
  entryDate: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Email = mongoose.model('Email', emailSchema);
const EmailRead = mongoose.model('EmailRead', emailReadSchema);
const EmailDeletion = mongoose.model('EmailDeletion', emailDeletionSchema);
const EmailArchive = mongoose.model('EmailArchive', emailArchiveSchema);
const PermanentEmailDeletion = mongoose.model('PermanentEmailDeletion', permanentEmailDeletionSchema);
const DistributionList = mongoose.model('DistributionList', distributionListSchema);
const ActiveSession = mongoose.model('ActiveSession', activeSessionSchema);
const LoginHistory = mongoose.model('LoginHistory', loginHistorySchema);

// Initialize database with sample data
const initializeDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      const sampleUsers = [
        {
          id: 'admin-1',
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@company.com',
          password: 'admin123',
          role: 'admin',
          department: 'IT',
          isActive: true,
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facepad&facepad=2&w=256&h=256&q=80'
        },
        {
          id: 'manager-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@company.com',
          password: 'user123',
          role: 'manager',
          department: 'Marketing',
          isActive: true,
          avatar: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facepad&facepad=2&w=256&h=256&q=80'
        },
        {
          id: 'agent-1',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@company.com',
          password: 'user123',
          role: 'agent',
          department: 'Sales',
          isActive: true,
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facepad&facepad=2&w=256&h=256&q=80'
        },
        {
          id: 'manager-2',
          firstName: 'Bob',
          lastName: 'Johnson',
          email: 'bob@company.com',
          password: 'user123',
          role: 'manager',
          department: 'HR',
          isActive: true,
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facepad&facepad=2&w=256&h=256&q=80'
        },
        {
          id: 'agent-2',
          firstName: 'Alice',
          lastName: 'Brown',
          email: 'alice@company.com',
          password: 'user123',
          role: 'agent',
          department: 'Finance',
          isActive: true,
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facepad&facepad=2&w=256&h=256&q=80'
        }
      ];
      
      await User.insertMany(sampleUsers);
    logDebug('Sample users inserted successfully');
      
      // Insert sample emails
      const sampleEmails = [
        {
          id: 'email-1',
          subject: 'Welcome to the Company',
          body: 'Welcome to our company! We are excited to have you on board.',
          senderId: 'admin-1',
          recipientIds: ['manager-1', 'agent-1'],
          sentAt: new Date('2024-01-15T10:00:00Z')
        },
        {
          id: 'email-2',
          subject: 'Team Meeting Tomorrow',
          body: 'Don\'t forget about our team meeting tomorrow at 10 AM in the conference room.',
          senderId: 'manager-1',
          recipientIds: ['agent-1', 'manager-2'],
          sentAt: new Date('2024-01-16T14:30:00Z')
        },
        {
          id: 'email-3',
          subject: 'Project Update',
          body: 'Here\'s the latest update on our current project. Please review and provide feedback.',
          senderId: 'agent-1',
          recipientIds: ['admin-1', 'manager-1', 'manager-2'],
          sentAt: new Date('2024-01-17T09:15:00Z')
        }
      ];
      
      await Email.insertMany(sampleEmails);
    logDebug('Sample emails inserted successfully');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Initialize database on startup
initializeDatabase();

// Routes

// User routes
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().sort({ name: 1 });
    
    // Ensure admin users have canSendAttachments set to true by default
    const usersWithAttachmentPermissions = users.map(user => {
      if (user.role === 'admin' && user.canSendAttachments === undefined) {
        return {
          ...user.toObject(),
          canSendAttachments: true
        };
      }
      return user;
    });
    
    res.json(usersWithAttachmentPermissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Activity Report endpoint
app.post('/api/users/:id/activity-report', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const requestingUserId = req.params.id;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Verify the requesting user exists and has admin role
    const requestingUser = await User.findOne({ id: requestingUserId });
    if (!requestingUser) {
      return res.status(404).json({ error: 'Requesting user not found' });
    }

    if (requestingUser.role !== 'admin' && requestingUser.role !== 'manager') {
      return res.status(403).json({ error: 'Only administrators and managers can view activity reports' });
    }

    // Get all users except the requesting admin
    const users = await User.find({ id: { $ne: requestingUserId } });
    
    // Generate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Normalize dates to avoid timezone issues
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    const dates = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Build activity report for each user
    const reportData = users.map(user => {
      const loginByDate = {};
      
      dates.forEach(date => {
        // For now, simulate login activity based on user creation date
        // In a real app, you'd check actual login history or session data
        const userCreated = new Date(user.createdAt);
        const checkDate = new Date(date);
        
        // User logged in if they existed before this date (simplified logic)
        // Returns 'Yes' or 'No' instead of boolean
        loginByDate[date] = userCreated <= checkDate ? 'Yes' : 'No';
      });

      return {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        userRole: user.role,
        loginByDate
      };
    });

    const response = {
      reportData,
      dates,
      dateRange: {
        startDate: startDate,
        endDate: endDate
      },
      totalUsers: users.length
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users with attachment permissions (for admin panel)
app.get('/api/users/attachment-permissions', async (req, res) => {
  try {
    const { adminUserId } = req.query;
    
  logDebug(`[Attachment Permissions] Request received with adminUserId: ${adminUserId}`);
    
    if (!adminUserId) {
  logDebug('[Attachment Permissions] No adminUserId provided');
      return res.status(400).json({ error: 'Admin user ID is required' });
    }
    
    // Verify the admin user exists and has admin role
  logDebug(`[Attachment Permissions] Looking for admin user with id: ${adminUserId}`);
    const adminUser = await User.findOne({ id: adminUserId });
  logDebug(`[Attachment Permissions] Admin user query result:`, adminUser);
    
    if (!adminUser) {
  logDebug(`[Attachment Permissions] Admin user not found: ${adminUserId}`);
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    if (adminUser.role !== 'admin') {
  logDebug(`[Attachment Permissions] User is not admin, role: ${adminUser.role}`);
      return res.status(403).json({ error: 'Only administrators can view attachment permissions' });
    }
    
  logDebug(`[Attachment Permissions] Admin user verified: ${adminUser.id}`);
    
    // Get all admin, manager, team-leader, and bde users with their attachment permissions
    const users = await User.find({ 
      role: { $in: ['admin', 'manager', 'team-leader', 'bde'] } 
    }).select('id firstName lastName email role canSendAttachments');
    
    const usersWithPermissions = users.map(user => ({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      userRole: user.role,
      canSendAttachments: user.role === 'admin' && user.canSendAttachments === undefined ? true : (user.canSendAttachments || false)
    }));
    
    res.json(usersWithPermissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const newUser = new User({
      ...req.body,
      id: req.body.id || `user-${userCount + 1}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Password change endpoint
app.put('/api/users/:id/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    // Find the user
    const user = await User.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password (in a real app, you'd use bcrypt to compare hashed passwords)
    if (user.password !== currentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }
    
    // Update password (in a real app, you'd hash the password before storing)
    user.password = newPassword;
    user.updatedAt = new Date();
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin password reset endpoint
app.put('/api/users/:id/reset-password', async (req, res) => {
  try {
    const { adminUserId } = req.body;
    
    if (!adminUserId) {
      return res.status(400).json({ error: 'Admin user ID is required' });
    }
    
    // Verify the admin user exists and has admin role
    const adminUser = await User.findOne({ id: adminUserId });
    if (!adminUser) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    if (adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can reset passwords' });
    }
    
    // Find the user to reset password for
    const user = await User.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Reset password to temp123
    user.password = 'temp123';
    user.updatedAt = new Date();
    await user.save();
    
    res.json({ message: 'Password reset successfully', temporaryPassword: 'temp123' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({ id: req.params.id });
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Also remove related email reads
    await EmailRead.deleteMany({ userId: req.params.id });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Attachment permission management endpoints
app.get('/api/users/:id/attachment-permission', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Grant attachment permissions to admin users by default if not explicitly set
    let canSendAttachments = user.canSendAttachments;
    if (canSendAttachments === undefined && user.role === 'admin') {
      canSendAttachments = true;
    }
    
    res.json({ 
      canSendAttachments: canSendAttachments !== undefined ? canSendAttachments : false,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      userRole: user.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id/attachment-permission', async (req, res) => {
  try {
    const { canSendAttachments, adminUserId } = req.body;
    
    if (canSendAttachments === undefined || !adminUserId) {
      return res.status(400).json({ error: 'canSendAttachments and adminUserId are required' });
    }
    
    // Verify the admin user exists and has admin role
    const adminUser = await User.findOne({ id: adminUserId });
    if (!adminUser) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    if (adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can modify attachment permissions' });
    }
    
    // Find the user to update
    const user = await User.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Allow attachment permission changes for admin, manager, team-leader, and bde roles
    if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'team-leader' && user.role !== 'bde') {
      return res.status(400).json({ error: 'Attachment permissions can only be set for Admin, Manager, Team Leader, and BDE roles' });
    }
    
    user.canSendAttachments = canSendAttachments;
    user.updatedAt = new Date();
    await user.save();
    
    res.json({ 
      message: 'Attachment permission updated successfully',
      canSendAttachments: user.canSendAttachments,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      userRole: user.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Activity Report Routes
// Get user login history for activity report
app.get('/api/users/:userId/login-history', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Get the user
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build date range query
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery = {
        entryDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }
    
    // Get login history for the user
    const loginHistory = await LoginHistory.find({
      userId: userId,
      ...dateQuery
    }).sort({ entryDate: -1 });
    
    res.json(loginHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users with their login activity for a date range
// Create or update manual login entry
app.post('/api/users/:userId/login-history', async (req, res) => {
  try {
    const { userId } = req.params;
    const { loginDate, adminUserId } = req.body;
    
    if (!adminUserId) {
      return res.status(400).json({ error: 'Admin user ID is required' });
    }
    
    if (!loginDate) {
      return res.status(400).json({ error: 'Login date is required' });
    }
    
    // Verify the admin user exists and has admin/manager role, OR is the user themselves
    const adminUser = await User.findOne({ id: adminUserId });
    if (!adminUser) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    // Allow users to create their own login history, but only admins/managers can create for others
    if (adminUser.role !== 'admin' && adminUser.role !== 'manager' && adminUserId !== userId) {
      return res.status(403).json({ error: 'Only administrators and managers can modify other users login history' });
    }
    
    // Get the user
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create manual login entry
    const loginCount = await LoginHistory.countDocuments();
    const newLoginEntry = new LoginHistory({
      id: `login-${Date.now()}-${loginCount + 1}`,
      userId: userId,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      userRole: user.role,
      userDepartment: user.department,
      loginTime: new Date(loginDate),
      entryDate: new Date(loginDate),
      isManualEntry: true
    });
    
    await newLoginEntry.save();
    
    res.json({
      message: 'Manual login entry created successfully',
      loginEntry: newLoginEntry
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete login history entry
app.delete('/api/users/:userId/login-history/:entryId', async (req, res) => {
  try {
    const { userId, entryId } = req.params;
    const { adminUserId } = req.body;
    
    if (!adminUserId) {
      return res.status(400).json({ error: 'Admin user ID is required' });
    }
    
    // Verify the admin user exists and has admin/manager role
    const adminUser = await User.findOne({ id: adminUserId });
    if (!adminUser) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    if (adminUser.role !== 'admin' && adminUser.role !== 'manager') {
      return res.status(403).json({ error: 'Only administrators and managers can modify user login history' });
    }
    
    // Delete the login history entry
    const result = await LoginHistory.findOneAndDelete({
      id: entryId,
      userId: userId
    });
    
    if (!result) {
      return res.status(404).json({ error: 'Login history entry not found' });
    }
    
    res.json({ message: 'Login history entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Email routes
app.get('/api/emails', async (req, res) => {
  try {
    const { userId, archived } = req.query; // Get userId and archived from query parameters
    
  logDebug(`[API Request] /api/emails - userId: ${userId}, archived: ${archived}`);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Get user's deleted emails
    const userDeletions = await EmailDeletion.find({ userId: userId });
    const deletedEmailIds = userDeletions.map(deletion => deletion.emailId);
  logDebug(`[API Debug] Deleted email IDs:`, deletedEmailIds);
    
    // Get user's permanently deleted emails
    const userPermanentDeletions = await PermanentEmailDeletion.find({ userId: userId });
    const permanentlyDeletedEmailIds = userPermanentDeletions.map(deletion => deletion.emailId);
  logDebug(`[API Debug] Permanently deleted email IDs:`, permanentlyDeletedEmailIds);
    
    // Get user's archived emails
    const userArchives = await EmailArchive.find({ userId: userId });
    const archivedEmailIds = userArchives.map(archive => archive.emailId);
  logDebug(`[API Debug] Archived email IDs:`, archivedEmailIds);
    
    let filteredEmails = [];
    
    if (archived === 'true') {
  logDebug(`[API Debug] Fetching archived emails for user ${userId}`);
      // For archived view, get emails where user is either sender or recipient, and are archived
      const emails = await Email.find({ 
        isDeleted: { $ne: true },
        $or: [
          { senderId: userId }, // Emails sent by user
          { recipientIds: userId } // Emails received by user
        ]
      }).sort({ sentAt: -1 });
      
  logDebug(`[API Debug] Found ${emails.length} total emails for user`);
  logDebug(`[API Debug] Email IDs found:`, emails.map(e => e.id));
      
      // Filter to only include emails that are archived by this user
      filteredEmails = emails.filter(email => archivedEmailIds.includes(email.id));
      
      // Filter out emails that this user has permanently deleted
      filteredEmails = filteredEmails.filter(email => !permanentlyDeletedEmailIds.includes(email.id));
  logDebug(`[API Debug] After filtering for archived: ${filteredEmails.length} emails`);
    } else {
  logDebug(`[API Debug] Fetching inbox emails for user ${userId}`);
      // For inbox view, only show emails received by user (not sent by user)
      const emails = await Email.find({ 
        isDeleted: { $ne: true },
        recipientIds: userId // Only emails received by the user (not sent by user)
      }).sort({ sentAt: -1 });
      
      filteredEmails = emails;
      
      // Filter out emails that this user has deleted
      filteredEmails = filteredEmails.filter(email => !deletedEmailIds.includes(email.id));
      
      // Filter out emails that this user has permanently deleted
      filteredEmails = filteredEmails.filter(email => !permanentlyDeletedEmailIds.includes(email.id));
      
      // Filter out emails that are archived
      filteredEmails = filteredEmails.filter(email => !archivedEmailIds.includes(email.id));
      
  logDebug(`[API Debug] Returning ${filteredEmails.length} inbox emails`);
    }
    
  logDebug(`[API Response] Returning ${filteredEmails.length} emails`);
    res.json(filteredEmails);
  } catch (error) {
    console.error(`[API Error] Error in /api/emails:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get sent emails for a specific user
app.get('/api/emails/sent', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Get all emails sent by the user
    const sentEmails = await Email.find({ 
      isDeleted: { $ne: true },
      senderId: userId // Only emails sent by this user
    }).sort({ sentAt: -1 });
    
    res.json(sentEmails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/emails', async (req, res) => {
  try {
    const emailCount = await Email.countDocuments();
    const newEmail = new Email({
      ...req.body,
      id: req.body.id || `email-${emailCount + 1}`,
      sentAt: new Date(),
      createdAt: new Date()
    });
    await newEmail.save();
    
    // Emit real-time notification to recipients
    if (newEmail.recipientIds && newEmail.recipientIds.length > 0) {
      // Get sender information for notification
      const sender = await User.findOne({ id: newEmail.senderId });
      const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown Sender';
      
      newEmail.recipientIds.forEach(recipientId => {
        io.to(`user-${recipientId}`).emit('new-email', {
          id: newEmail.id,
          subject: newEmail.subject,
          senderId: newEmail.senderId,
          senderName: senderName,
          senderEmail: sender?.email || 'unknown@company.com',
          sentAt: newEmail.sentAt,
          priority: newEmail.priority,
          bodyPreview: newEmail.body.substring(0, 100) + (newEmail.body.length > 100 ? '...' : '')
        });
      });
    }
    
    res.status(201).json(newEmail);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/emails/:id', async (req, res) => {
  try {
    const { userId } = req.body; // Get userId from request body
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const email = await Email.findOne({ id: req.params.id });
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Check if user has already deleted this email
    const existingDeletion = await EmailDeletion.findOne({ 
      emailId: req.params.id, 
      userId: userId 
    });
    
    if (existingDeletion) {
      return res.status(400).json({ error: 'Email already deleted by this user' });
    }
    
    // Create user-specific deletion record
    const deletionCount = await EmailDeletion.countDocuments();
    const newDeletion = new EmailDeletion({
      id: `deletion-${Date.now()}-${deletionCount + 1}`,
      emailId: req.params.id,
      userId: userId,
      deletedAt: new Date()
    });
    
    await newDeletion.save();
    
    res.json({ message: 'Email moved to trash successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Email archive routes
app.post('/api/emails/:id/archive', async (req, res) => {
  try {
    const { userId } = req.body; // Get userId from request body
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const email = await Email.findOne({ id: req.params.id });
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Check if user has already archived this email
    const existingArchive = await EmailArchive.findOne({ 
      emailId: req.params.id, 
      userId: userId 
    });
    
    if (existingArchive) {
      return res.status(400).json({ error: 'Email already archived by this user' });
    }
    
    // Create user-specific archive record
    const archiveCount = await EmailArchive.countDocuments();
    const newArchive = new EmailArchive({
      id: `archive-${archiveCount + 1}`,
      emailId: req.params.id,
      userId: userId,
      archivedAt: new Date()
    });
    
    await newArchive.save();
    
    // Emit Socket.IO event for real-time archive notification
    if (io) {
      io.to(`user-${userId}`).emit('email-archived', {
        emailId: req.params.id,
        userId: userId,
        archivedAt: new Date()
      });
    }
    
    res.json({ message: 'Email archived successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/emails/:id/archive', async (req, res) => {
  try {
    const { userId } = req.body; // Get userId from request body
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const existingArchive = await EmailArchive.findOne({ 
      emailId: req.params.id, 
      userId: userId 
    });
    
    if (!existingArchive) {
      return res.status(404).json({ error: 'Email archive not found' });
    }
    
    await EmailArchive.deleteOne({ 
      emailId: req.params.id, 
      userId: userId 
    });
    
    // Emit Socket.IO event for real-time unarchive notification
    if (io) {
      io.to(`user-${userId}`).emit('email-unarchived', {
        emailId: req.params.id,
        userId: userId,
        unarchivedAt: new Date()
      });
    }
    
    res.json({ message: 'Email unarchived successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/emails/bulk-archive', async (req, res) => {
  try {
    const { emailIds, userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({ error: 'Email IDs array is required' });
    }
    
    const results = [];
    
    for (const emailId of emailIds) {
      try {
        // Check if email exists
        const email = await Email.findOne({ id: emailId });
        if (!email) {
          results.push({ emailId, success: false, error: 'Email not found' });
          continue;
        }
        
        // Check if user has already archived this email
        const existingArchive = await EmailArchive.findOne({ 
          emailId: emailId, 
          userId: userId 
        });
        
        if (existingArchive) {
          results.push({ emailId, success: false, error: 'Email already archived' });
          continue;
        }
        
        // Create user-specific archive record
        const archiveCount = await EmailArchive.countDocuments();
        const newArchive = new EmailArchive({
          id: `archive-${archiveCount + Date.now()}-${emailId}`,
          emailId: emailId,
          userId: userId,
          archivedAt: new Date()
        });
        
        await newArchive.save();
        results.push({ emailId, success: true });
      } catch (error) {
        results.push({ emailId, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    // Emit Socket.IO event for bulk archive notification
    if (io) {
      io.to(`user-${userId}`).emit('email-archived', {
        emailIds: emailIds,
        userId: userId,
        archivedAt: new Date(),
        bulkOperation: true,
        successCount: successCount
      });
    }
    
    res.json({ 
      message: `${successCount} email(s) archived successfully`,
      results: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Email read routes
app.get('/api/email-reads', async (req, res) => {
  try {
    const emailReads = await EmailRead.find().sort({ readAt: -1 });
    res.json(emailReads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/email-reads', async (req, res) => {
  try {
    const { emailId, userId } = req.body;
    const id = `${emailId}-${userId}`;
    
    // Use upsert to avoid duplicates
    const emailRead = await EmailRead.findOneAndUpdate(
      { id },
      {
        id,
        emailId,
        userId,
        readAt: new Date(),
        createdAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    res.json(emailRead);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark email as unread by deleting the email read record
app.delete('/api/email-reads/:emailId/:userId', async (req, res) => {
  try {
    const { emailId, userId } = req.params;
    const id = `${emailId}-${userId}`;
    
    const deletedEmailRead = await EmailRead.findOneAndDelete({ id });
    
    if (!deletedEmailRead) {
      return res.status(404).json({ error: 'Email read record not found' });
    }
    
    res.json({ message: 'Email marked as unread successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get read receipt data for a specific email
app.get('/api/emails/:emailId/read-receipts', async (req, res) => {
  try {
    const { emailId } = req.params;
    
    // Get the email first to get recipient information
    const email = await Email.findOne({ id: emailId });
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Get all read records for this email
    const emailReads = await EmailRead.find({ emailId });
    
    // Separate user IDs from email addresses in recipientIds
    const userIds = email.recipientIds.filter(id => !id.includes('@'));
    const emailAddresses = email.recipientIds.filter(id => id.includes('@'));
    
    // Get all recipients (users) for this email by user IDs
    const recipientsById = await User.find({ id: { $in: userIds } });
    
    // Get all recipients (users) for this email by email addresses
    const recipientsByEmail = await User.find({ email: { $in: emailAddresses } });
    
    // Combine all recipients
    const allRecipients = [...recipientsById, ...recipientsByEmail];
    
    // Handle recipients that couldn't be found as users (external emails)
    const externalRecipients = emailAddresses.filter(email => 
      !recipientsByEmail.some(user => user.email === email)
    ).map(email => ({
      id: email,
      firstName: 'External',
      lastName: 'User',
      email: email,
      role: 'external'
    }));
    
    // Combine all recipients including external ones
    const allRecipientsWithExternal = [...allRecipients, ...externalRecipients];
    
    // Create read receipt data combining recipient info with read status
    const readReceiptData = allRecipientsWithExternal.map(recipient => {
      const readRecord = emailReads.find(read => read.userId === recipient.id);
      return {
        recipientId: recipient.id,
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        recipientEmail: recipient.email,
        recipientRole: recipient.role,
        isRead: !!readRecord,
        readAt: readRecord ? readRecord.readAt : null
      };
    });
    
    res.json(readReceiptData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trash endpoints
app.get('/api/trash', async (req, res) => {
  try {
    const { userId } = req.query; // Get userId from query parameters
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Get user's deleted emails
    const userDeletions = await EmailDeletion.find({ userId: userId }).sort({ deletedAt: -1 });
    const deletedEmailIds = userDeletions.map(deletion => deletion.emailId);
    
    if (deletedEmailIds.length === 0) {
      return res.json([]);
    }
    
    // Get the actual email documents
    const trashedEmails = await Email.find({ 
      id: { $in: deletedEmailIds },
      isDeleted: { $ne: true } // Exclude globally deleted emails
    }).sort({ sentAt: -1 });
    
    // Add deletedAt timestamp from EmailDeletion records
    const emailsWithDeletionInfo = trashedEmails.map(email => {
      const deletion = userDeletions.find(d => d.emailId === email.id);
      return {
        ...email.toObject(),
        deletedAt: deletion ? deletion.deletedAt : null
      };
    });
    
    res.json(emailsWithDeletionInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/trash/:id/restore', async (req, res) => {
  try {
    const { userId } = req.body; // Get userId from request body
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Find the user's deletion record
    const deletion = await EmailDeletion.findOne({ 
      emailId: req.params.id, 
      userId: userId 
    });
    
    if (!deletion) {
      return res.status(404).json({ error: 'Email not found in user\'s trash' });
    }
    
    // Remove the deletion record to restore the email
    await EmailDeletion.findOneAndDelete({ 
      emailId: req.params.id, 
      userId: userId 
    });
    
    res.json({ message: 'Email restored successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/trash/:id/permanent', async (req, res) => {
  try {
    const { userId } = req.body; // Get userId from request body
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Find the user's deletion record
    const deletion = await EmailDeletion.findOne({ 
      emailId: req.params.id, 
      userId: userId 
    });
    
    if (!deletion) {
      return res.status(404).json({ error: 'Email not found in user\'s trash' });
    }
    
    // Remove the user's deletion record
    await EmailDeletion.findOneAndDelete({ 
      emailId: req.params.id, 
      userId: userId 
    });
    
    // Create permanent deletion record to ensure email doesn't reappear in inbox
    const existingPermanentDeletion = await PermanentEmailDeletion.findOne({ 
      emailId: req.params.id, 
      userId: userId 
    });
    
    if (!existingPermanentDeletion) {
      const permanentDeletionCount = await PermanentEmailDeletion.countDocuments();
      const newPermanentDeletion = new PermanentEmailDeletion({
        id: `permanent-deletion-${Date.now()}-${permanentDeletionCount + 1}`,
        emailId: req.params.id,
        userId: userId,
        permanentlyDeletedAt: new Date()
      });
      await newPermanentDeletion.save();
    }
    
    res.json({ message: 'Email permanently deleted from your trash' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/trash/empty', async (req, res) => {
  try {
    const { userId } = req.body; // Get userId from request body
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Get all user's deleted emails
    const userDeletions = await EmailDeletion.find({ userId: userId });
    const deletedEmailIds = userDeletions.map(deletion => deletion.emailId);
    
    if (deletedEmailIds.length === 0) {
      return res.json({ message: 'Trash is already empty', deletedCount: 0 });
    }
    
    // Remove the user's deletion records
    await EmailDeletion.deleteMany({ userId: userId });
    
    // Create permanent deletion records for all emails
    const permanentDeletionCount = await PermanentEmailDeletion.countDocuments();
    const permanentDeletions = deletedEmailIds.map((emailId, index) => ({
      id: `permanent-deletion-${Date.now()}-${permanentDeletionCount + index + 1}`,
      emailId: emailId,
      userId: userId,
      permanentlyDeletedAt: new Date()
    }));
    
    // Filter out any that already exist
    const existingPermanentDeletions = await PermanentEmailDeletion.find({
      emailId: { $in: deletedEmailIds },
      userId: userId
    });
    const existingEmailIds = existingPermanentDeletions.map(pd => pd.emailId);
    const newPermanentDeletions = permanentDeletions.filter(pd => !existingEmailIds.includes(pd.emailId));
    
    if (newPermanentDeletions.length > 0) {
      await PermanentEmailDeletion.insertMany(newPermanentDeletions);
    }
    
    res.json({ message: 'Trash emptied successfully', deletedCount: userDeletions.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Distribution List routes
app.get('/api/distribution-lists', async (req, res) => {
  try {
    const lists = await DistributionList.find().sort({ name: 1 });
    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/distribution-lists/:id', async (req, res) => {
  try {
    const list = await DistributionList.findOne({ id: req.params.id });
    if (!list) {
      return res.status(404).json({ error: 'Distribution list not found' });
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/distribution-lists', async (req, res) => {
  try {
    const listCount = await DistributionList.countDocuments();
    const newList = new DistributionList({
      ...req.body,
      id: req.body.id || `list-${listCount + 1}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await newList.save();
    res.status(201).json(newList);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/distribution-lists/:id', async (req, res) => {
  try {
    const updatedList = await DistributionList.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!updatedList) {
      return res.status(404).json({ error: 'Distribution list not found' });
    }
    res.json(updatedList);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/distribution-lists/:id', async (req, res) => {
  try {
    const deletedList = await DistributionList.findOneAndDelete({ id: req.params.id });
    if (!deletedList) {
      return res.status(404).json({ error: 'Distribution list not found' });
    }
    res.json({ message: 'Distribution list deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join user to their personal room for targeted notifications
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Admin API endpoints for message log access
// Middleware to verify admin access
const requireAdminAccess = async (req, res, next) => {
  try {
    const adminUserId = req.query.adminUserId || req.headers['x-admin-user-id'];
    
    console.log(`[Admin Middleware] Checking access for user: ${adminUserId}`);
    
    if (!adminUserId) {
      console.log(`[Admin Middleware] No adminUserId provided`);
      return res.status(401).json({ error: 'Admin user ID is required' });
    }
    
    const adminUser = await User.findOne({ id: adminUserId });
    if (!adminUser) {
      console.log(`[Admin Middleware] Admin user not found: ${adminUserId}`);
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    // Allow admin, manager, and team-leader roles to access admin endpoints
    if (!['admin', 'manager', 'team-leader'].includes(adminUser.role)) {
      console.log(`[Admin Middleware] Insufficient permissions. User role: ${adminUser.role}`);
      return res.status(403).json({ error: 'Insufficient permissions for admin access' });
    }
    
    console.log(`[Admin Middleware] Access granted for user: ${adminUserId}, role: ${adminUser.role}`);
    req.adminUser = adminUser;
    next();
  } catch (error) {
    console.log(`[Admin Middleware] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get all emails (admin access)
app.get('/api/admin/emails', requireAdminAccess, async (req, res) => {
  try {
    const { page = 1, limit = 100, sortBy = 'sentAt', sortOrder = 'desc' } = req.query;
    
    console.log(`[Admin API Request] /api/admin/emails - page: ${page}, limit: ${limit}, sortBy: ${sortBy}, sortOrder: ${sortOrder}`);
    
    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get all emails excluding deleted ones
    const emails = await Email.find({ isDeleted: { $ne: true } })
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalCount = await Email.countDocuments({ isDeleted: { $ne: true } });
    
    console.log(`[Admin API Response] Returning ${emails.length} emails out of ${totalCount} total`);
    
    res.json({
      emails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.log(`[Admin API Error] Error in /api/admin/emails:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get specific email details (admin access)
app.get('/api/admin/emails/:emailId', requireAdminAccess, async (req, res) => {
  try {
    const email = await Email.findOne({ id: req.params.emailId, isDeleted: { $ne: true } });
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    res.json(email);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search messages with filters (admin access)
app.get('/api/admin/emails/search', requireAdminAccess, async (req, res) => {
  try {
    const {
      query,
      senderId,
      recipientId,
      dateFrom,
      dateTo,
      hasAttachments,
      isRead,
      priority,
      page = 1,
      limit = 50
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build query filter
    const filter = { isDeleted: { $ne: true } };
    
    // Text search filter
    if (query) {
      filter.$or = [
        { subject: { $regex: query, $options: 'i' } },
        { body: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Sender filter
    if (senderId) {
      filter.senderId = senderId;
    }
    
    // Recipient filter
    if (recipientId) {
      filter.recipientIds = recipientId;
    }
    
    // Date range filters
    if (dateFrom) {
      filter.sentAt = { $gte: new Date(dateFrom) };
    }
    
    if (dateTo) {
      filter.sentAt = { ...filter.sentAt, $lte: new Date(dateTo) };
    }
    
    // Priority filter
    if (priority) {
      filter.priority = priority;
    }
    
    // Attachment filter
    if (hasAttachments === 'true') {
      filter.attachments = { $exists: true, $ne: [] };
    }
    
    // Execute query
    let emails = await Email.find(filter)
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalCount = await Email.countDocuments(filter);
    
    // Apply read status filter if needed
    if (isRead !== undefined) {
      const emailIds = emails.map(email => email.id);
      const emailReads = await EmailRead.find({ 
        emailId: { $in: emailIds } 
      });
      
      const readEmailIds = new Set(emailReads.map(read => read.emailId));
      
      emails = emails.filter(email => {
        const isEmailRead = readEmailIds.has(email.id);
        return isRead === 'true' ? isEmailRead : !isEmailRead;
      });
    }
    
    res.json({
      emails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all active sessions (for live queue)
app.get('/api/sessions/active', async (req, res) => {
  try {
    const { adminUserId } = req.query;
    
    if (!adminUserId) {
      return res.status(400).json({ error: 'Admin user ID is required' });
    }
    
    // Verify the admin user exists and has admin role
    const adminUser = await User.findOne({ id: adminUserId });
    if (!adminUser) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    if (adminUser.role !== 'admin' && adminUser.role !== 'manager' && adminUser.role !== 'team-leader') {
      return res.status(403).json({ error: 'Only administrators, managers, and team leaders can view active sessions' });
    }
    
    // Calculate cutoff time for inactive sessions (30 minutes ago)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    // Get all active sessions and filter out orphaned sessions (users that don't exist in User collection)
    // Also filter out sessions that have been inactive for more than 30 minutes
    const allActiveSessions = await ActiveSession.find({ isActive: true })
      .sort({ loginTime: -1 });
    
    // Get list of valid user IDs from User collection
    const validUserIds = await User.distinct('id');
    
    // Filter sessions to only include users that exist in User collection
    // and have been active within the last 30 minutes
    const validSessions = allActiveSessions.filter(session => {
      const isUserValid = validUserIds.includes(session.userId);
      const isSessionActive = new Date(session.lastActivity) >= thirtyMinutesAgo;
      return isUserValid && isSessionActive;
    });
    
    // Clean up orphaned and stale sessions in background
    const orphanedSessions = allActiveSessions.filter(session => 
      !validUserIds.includes(session.userId)
    );
    
    const staleSessions = allActiveSessions.filter(session => 
      new Date(session.lastActivity) < thirtyMinutesAgo
    );
    
    if (orphanedSessions.length > 0 || staleSessions.length > 0) {
      const totalCleanup = orphanedSessions.length + staleSessions.length;
      console.log(`Found ${totalCleanup} sessions to clean up (${orphanedSessions.length} orphaned, ${staleSessions.length} stale)`);
      
      // Clean up orphaned sessions
      if (orphanedSessions.length > 0) {
        await ActiveSession.deleteMany({ 
          userId: { $in: orphanedSessions.map(s => s.userId) } 
        });
      }
      
      // Clean up stale sessions
      if (staleSessions.length > 0) {
        await ActiveSession.deleteMany({ 
          userId: { $in: staleSessions.map(s => s.userId) } 
        });
      }
    }
    
    res.json(validSessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update active session when user logs in
app.post('/api/sessions/active', async (req, res) => {
  try {
    const { userId, userName, userEmail, userRole, userDepartment, socketId } = req.body;
    
    if (!userId || !userName || !userEmail || !userRole) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate that the user exists in the User collection
    const existingUser = await User.findOne({ id: userId });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found in system. Cannot create active session.' });
    }
    
    // Update or create active session
    const session = await ActiveSession.findOneAndUpdate(
      { userId },
      {
        userId,
        userName,
        userEmail,
        userRole,
        userDepartment,
        socketId,
        loginTime: new Date(),
        lastActivity: new Date(),
        isActive: true
      },
      { upsert: true, new: true }
    );
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove active session when user logs out
app.delete('/api/sessions/active/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await ActiveSession.findOneAndDelete({ userId });
    
    res.json({ message: 'Session ended successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update last activity for a session
app.put('/api/sessions/active/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const session = await ActiveSession.findOneAndUpdate(
      { userId },
      { lastActivity: new Date() },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({ error: 'Active session not found' });
    }
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Scheduled cleanup task for stale sessions
const cleanupStaleSessions = async () => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    // Find all stale sessions (inactive for more than 30 minutes)
    const staleSessions = await ActiveSession.find({
      isActive: true,
      lastActivity: { $lt: thirtyMinutesAgo }
    });
    
    if (staleSessions.length > 0) {
      console.log(`Scheduled cleanup: Found ${staleSessions.length} stale sessions to clean up`);
      
      // Delete stale sessions
      const result = await ActiveSession.deleteMany({
        userId: { $in: staleSessions.map(s => s.userId) }
      });
      
      console.log(`Scheduled cleanup: Deleted ${result.deletedCount} stale sessions`);
    }
  } catch (error) {
    console.error('Error in scheduled session cleanup:', error);
  }
};

// Run cleanup every 15 minutes
setInterval(cleanupStaleSessions, 15 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Run initial cleanup on startup
  cleanupStaleSessions();
});