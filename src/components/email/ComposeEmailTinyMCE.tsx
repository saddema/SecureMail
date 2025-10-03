import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { X, Paperclip, Send, Plus, Users, Minimize2, List, FileText } from 'lucide-react';
import 'tinymce/tinymce';
import { useAuth } from '../../contexts/AuthContext';
import { getUsers, sendEmail } from '../../utils/mockData';
import { User, Email, EmailWithSender } from '../../types';
import { DistributionListService } from '../../utils/distributionListService';
import MailMerge from './MailMerge';

interface ComposeEmailProps {
  onClose: () => void;
  onSend: (emailData: {
    to: string[];
    cc: string[];
    subject: string;
    body: string;
    attachments: { name: string; size: number; type: string }[];
  }) => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  replyTo?: EmailWithSender | null;
  forwardEmail?: EmailWithSender | null;
}

const ComposeEmailTinyMCE: React.FC<ComposeEmailProps> = ({
  onClose,
  onSend,
  isMinimized = false,
  onToggleMinimize,
  replyTo,
  forwardEmail
}) => {
  const { user } = useAuth();
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [toSuggestions, setToSuggestions] = useState<User[]>([]);
  const [ccSuggestions, setCcSuggestions] = useState<User[]>([]);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [showCcSuggestions, setShowCcSuggestions] = useState(false);
  const [showDistributionLists, setShowDistributionLists] = useState(false);
  const [distributionLists, setDistributionLists] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; size: number; type: string }[]>([]);
  const [showMailMerge, setShowMailMerge] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [canSendAttachments, setCanSendAttachments] = useState(false);
  const [loadingAttachmentPermission, setLoadingAttachmentPermission] = useState(true);
  const [isBDEUser, setIsBDEUser] = useState(false);

  const toInputRef = useRef<HTMLInputElement>(null);
  const ccInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form data based on reply or forward
  useEffect(() => {
    if (replyTo) {
      setTo([replyTo.sender.email]);
      setSubject(replyTo.subject.startsWith('Re: ') ? replyTo.subject : `Re: ${replyTo.subject}`);
      setBody(`<p><br></p><hr><p><strong>From:</strong> ${replyTo.sender.firstName} ${replyTo.sender.lastName} &lt;${replyTo.sender.email}&gt;</p><p><strong>Date:</strong> ${new Date(replyTo.sentAt).toLocaleString()}</p><p><strong>Subject:</strong> ${replyTo.subject}</p><br>${replyTo.body}`);
    } else if (forwardEmail) {
      setTo([]);
      setSubject(forwardEmail.subject.startsWith('Fwd: ') ? forwardEmail.subject : `Fwd: ${forwardEmail.subject}`);
      setBody(`<p><br></p><hr><p><strong>From:</strong> ${forwardEmail.sender.firstName} ${forwardEmail.sender.lastName} &lt;${forwardEmail.sender.email}&gt;</p><p><strong>Date:</strong> ${new Date(forwardEmail.sentAt).toLocaleString()}</p><p><strong>Subject:</strong> ${forwardEmail.subject}</p><br>${forwardEmail.body}`);
      
      // Include original attachments when forwarding
      if (forwardEmail.attachments && forwardEmail.attachments.length > 0) {
        const forwardedAttachments = forwardEmail.attachments.map(att => ({
          name: att.name || att.originalName,
          size: att.size,
          type: att.type,
          filename: att.filename,
          originalName: att.originalName || att.name
        }));
        setAttachments(forwardedAttachments);
      }
    }
  }, [replyTo, forwardEmail]);

  // Load distribution lists - Skip for BDE users
  useEffect(() => {
    const loadDistributionLists = async () => {
      // Don't load distribution lists for BDE users
      if (user?.role === 'bde') {
        setDistributionLists([]);
        return;
      }
      
      try {
        const lists = await DistributionListService.getAllLists();
        setDistributionLists(lists);
      } catch (error) {
        console.error('Error loading distribution lists:', error);
        setDistributionLists([]);
      }
    };
    
    loadDistributionLists();
  }, [user?.role]);

  // Check attachment permissions and user role
  useEffect(() => {
    const checkAttachmentPermission = async () => {
      if (!user?.id) {
        console.log('🚫 No user ID found, skipping permission check');
        setLoadingAttachmentPermission(false);
        setCanSendAttachments(false);
        return;
      }
      
      console.log(`🔍 Checking attachment permission for user: ${user.id} (${user.role})`);
      
      // Check if user is BDE
      setIsBDEUser(user.role === 'bde');
      
      try {
        setLoadingAttachmentPermission(true);
        const url = `/api/users/${user.id}/attachment-permission?adminUserId=${user.id}`;
        console.log(`📡 Fetching: ${url}`);
        
        const response = await fetch(url);
        console.log(`📊 Response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Permission data:`, data);
          setCanSendAttachments(data.canSendAttachments);
        } else {
          console.log(`❌ API call failed with status: ${response.status}`);
          // Default to false if API call fails
          setCanSendAttachments(false);
        }
      } catch (error) {
        console.error('💥 Error checking attachment permission:', error);
        // Default to false on error
        setCanSendAttachments(false);
      } finally {
        setLoadingAttachmentPermission(false);
        console.log(`🏁 Final canSendAttachments state: ${canSendAttachments}`);
      }
    };
    
    // Add a small delay to ensure user object is fully loaded
    const timer = setTimeout(() => {
      checkAttachmentPermission();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [user?.id, user?.role]);

  // Filter users for suggestions (exclude current user and already selected)
  const getFilteredUsers = async (input: string, selectedEmails: string[]) => {
    if (!input.trim()) return [];
    
    const query = input.toLowerCase();
    const users = await getUsers();
    return users
      .filter(u => 
        u.id !== user?.id && 
        !selectedEmails.includes(u.email) &&
        (`${u.firstName} ${u.lastName}`.toLowerCase().includes(query) ||
         u.email.toLowerCase().includes(query))
      )
      .slice(0, 5);
  };

  // Handle TO input changes
  const handleToInputChange = async (value: string) => {
    setToInput(value);
    if (value.trim().length > 0) {
      const suggestions = await getFilteredUsers(value, [...to, ...cc]);
      setToSuggestions(suggestions);
      setShowToSuggestions(suggestions.length > 0);
    } else {
      setToSuggestions([]);
      setShowToSuggestions(false);
    }
  };

  // Handle CC input changes
  const handleCcInputChange = async (value: string) => {
    setCcInput(value);
    if (value.trim().length > 0) {
      const suggestions = await getFilteredUsers(value, [...to, ...cc]);
      setCcSuggestions(suggestions);
      setShowCcSuggestions(suggestions.length > 0);
    } else {
      setCcSuggestions([]);
      setShowCcSuggestions(false);
    }
  };

  // Add recipient to TO field
  const addToRecipient = (email: string) => {
    if (!to.includes(email) && !cc.includes(email)) {
      setTo([...to, email]);
    }
    setToInput('');
    setShowToSuggestions(false);
    toInputRef.current?.focus();
  };

  // Add recipient to CC field
  const addCcRecipient = (email: string) => {
    if (!cc.includes(email) && !to.includes(email)) {
      setCc([...cc, email]);
    }
    setCcInput('');
    setShowCcSuggestions(false);
    ccInputRef.current?.focus();
  };

  // Remove recipient from TO field
  const removeToRecipient = (email: string) => {
    setTo(to.filter(e => e !== email));
  };

  // Remove recipient from CC field
  const removeCcRecipient = (email: string) => {
    setCc(cc.filter(e => e !== email));
  };

  // Handle TO key press
  const handleToKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && toInput.trim()) {
      e.preventDefault();
      const email = toInput.trim();
      if (email.includes('@') && !to.includes(email) && !cc.includes(email)) {
        setTo([...to, email]);
        setToInput('');
        setShowToSuggestions(false);
      }
    } else if (e.key === 'Backspace' && !toInput && to.length > 0) {
      setTo(to.slice(0, -1));
    }
  };

  // Handle CC key press
  const handleCcKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && ccInput.trim()) {
      e.preventDefault();
      const email = ccInput.trim();
      if (email.includes('@') && !cc.includes(email) && !to.includes(email)) {
        setCc([...cc, email]);
        setCcInput('');
        setShowCcSuggestions(false);
      }
    } else if (e.key === 'Backspace' && !ccInput && cc.length > 0) {
      setCc(cc.slice(0, -1));
    }
  };

  // Handle file attachment with upload
  const handleFileAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check if user has permission to send attachments
    if (!canSendAttachments) {
      alert('You do not have permission to send email attachments. Please contact your administrator.');
      return;
    }
    
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('attachments', file);
      });

      // Upload files to server
      const response = await fetch('http://localhost:5050/api/upload-attachments', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const result = await response.json();
      
      // Add uploaded files to attachments list
      const newAttachments = result.files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        filename: file.filename, // Server-generated filename
        originalName: file.originalName
      }));
      
      setAttachments([...attachments, ...newAttachments]);
      
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload files. Please try again.');
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Handle send email
  const handleSend = async () => {
    if (to.length === 0) {
      alert('Please add at least one recipient');
      return;
    }

    if (!subject.trim()) {
      alert('Please add a subject');
      return;
    }

    setSending(true);

    try {
      await onSend({
        to,
        cc,
        subject,
        body,
        attachments
      });

      // Reset form
      setTo([]);
      setCc([]);
      setSubject('');
      setBody('');
      setAttachments([]);
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Handle paste events for Excel tables and block images for BDE users
  const handleEditorPaste = (event: ClipboardEvent) => {
    console.log('🎯 TinyMCE Paste Event Detected!');
    
    // Block image pasting for BDE users
    if (isBDEUser) {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      const html = clipboardData.getData('text/html');
      const types = clipboardData.types;
      
      // Check for image data in clipboard
      const hasImageData = types.includes('Files') || 
                          html.includes('<img') || 
                          html.includes('data:image') ||
                          html.includes('base64') ||
                          clipboardData.getData('text/uri-list').includes('image');
      
      if (hasImageData) {
        console.log('🚫 Image paste blocked for BDE user!');
        event.preventDefault();
        event.stopPropagation();
        alert('Image pasting is not allowed for BDE users.');
        return;
      }
    }
    
    // TinyMCE has built-in Excel paste support, but let's add some debugging
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const html = clipboardData.getData('text/html');
    const plainText = clipboardData.getData('text/plain');
    
    console.log('📋 Clipboard HTML length:', html.length);
    console.log('📝 Clipboard plain text length:', plainText.length);
    
    if (html.includes('<table') || html.includes('urn:schemas-microsoft-com:office:excel')) {
      console.log('✅ Excel table detected by TinyMCE!');
      // Let TinyMCE handle it with its built-in Excel support
    } else if (plainText.includes('\t') && plainText.includes('\n')) {
      console.log('📊 Plain text table detected!');
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-6 w-80 bg-white border border-gray-300 rounded-t-lg shadow-lg z-50">
        <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
          <h3 className="font-medium text-gray-900">New Message</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Message</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex flex-col">
          {/* Sticky Recipients */}
          <div className="sticky top-0 z-30 bg-white p-3 space-y-2 border-b border-gray-200 flex-shrink-0">
            {/* TO Field */}
            <div className="relative">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700 w-8">To:</label>
                <div className="flex-1 relative">
                  <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
                    {to.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 text-sm rounded-full"
                      >
                        {email}
                        <button
                          onClick={() => removeToRecipient(email)}
                          className="ml-1 hover:text-primary-600"
                        >
                          <X className="w-2 h-2" />
                        </button>
                      </span>
                    ))}
                    <input
                      ref={toInputRef}
                      type="text"
                      value={toInput}
                      onChange={(e) => handleToInputChange(e.target.value)}
                      onKeyDown={handleToKeyPress}
                      className="flex-1 min-w-0 outline-none text-sm"
                      placeholder={to.length === 0 ? "Enter email addresses..." : ""}
                    />
                  </div>
                  
                  {/* TO Suggestions */}
                  {showToSuggestions && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                      {toSuggestions.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => addToRecipient(user.email)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-3"
                        >
                          <Users className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowCc(!showCc)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    CC
                  </button>
                  <div className="relative">
                    {!isBDEUser && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDistributionLists(!showDistributionLists);
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                      >
                        <List className="w-2 h-2" />
                        <span>Lists</span>
                      </button>
                    )}
                    
                    {/* Distribution Lists Dropdown */}
                    {showDistributionLists && !isBDEUser && (
                      <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                        <div className="p-2 border-b border-gray-200">
                          <div className="text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Distribution Lists
                          </div>
                        </div>
                        {distributionLists.map((list) => (
                          <div key={list.id} className="border-b border-gray-100 last:border-b-0">
                            <div className="px-3 py-2">
                              <div className="text-sm font-medium text-gray-900">{list.name}</div>
                              <div className="text-xs text-gray-500 mb-2">
                                {list.members.length} members
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    const newEmails = list.members.filter((email: string) => !to.includes(email) && !cc.includes(email));
                                    setTo([...to, ...newEmails]);
                                    setShowDistributionLists(false);
                                  }}
                                  className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                                >
                                  Add to TO
                                </button>
                                <button
                                  onClick={() => {
                                    const newEmails = list.members.filter((email: string) => !to.includes(email) && !cc.includes(email));
                                    setCc([...cc, ...newEmails]);
                                    setShowDistributionLists(false);
                                  }}
                                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                >
                                  Add to CC
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CC Field */}
            {showCc && (
              <div className="relative">
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-gray-700 w-8">CC:</label>
                  <div className="flex-1 relative">
                    <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
                      {cc.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded-full"
                        >
                          {email}
                          <button
                            onClick={() => removeCcRecipient(email)}
                            className="ml-1 hover:text-gray-600"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        </span>
                      ))}
                      <input
                        ref={ccInputRef}
                        type="text"
                        value={ccInput}
                        onChange={(e) => handleCcInputChange(e.target.value)}
                        onKeyDown={handleCcKeyPress}
                        className="flex-1 min-w-0 outline-none text-sm"
                        placeholder={cc.length === 0 ? "Enter email addresses..." : ""}
                      />
                    </div>
                    
                    {/* CC Suggestions */}
                    {showCcSuggestions && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto no-scrollbar">
                        {ccSuggestions.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => addCcRecipient(user.email)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-3"
                          >
                            <Users className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="p-4 border-b border-gray-200">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full text-lg font-medium text-gray-900 placeholder-gray-500 border-none outline-none"
            />
          </div>

          {/* Email Body with TinyMCE */}
          <div className="flex-1 border-t border-gray-200 overflow-auto no-scrollbar">
            <Editor
              onInit={(evt, editor) => {
                editorRef.current = editor;
                setEditorReady(true);
                console.log('✅ TinyMCE Editor Ready!');
              }}
              value={body}
              onEditorChange={(content) => setBody(content)}
              init={{
                height: 280,
                menubar: false,
                statusbar: false,
                base_url: '/node_modules/tinymce',
                suffix: '.min',
                license_key: 'gpl', // Use GPL license for community version
                plugins: isBDEUser 
                  ? ['advlist', 'autolink', 'lists', 'link', 'charmap', 'preview', 'help', 'wordcount']
                  : ['advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                     'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                     'insertdatetime', 'media', 'table', 'help', 'wordcount'],
                toolbar: isBDEUser
                  ? 'undo redo | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist | link | removeformat | help'
                  : 'undo redo | formatselect | ' +
                    'bold italic underline strikethrough | forecolor backcolor | ' +
                    'alignleft aligncenter alignright alignjustify | ' +
                    'bullist numlist outdent indent | table | ' +
                    'link image | removeformat | help',
                content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; margin: 16px; }',
                paste_data_images: !isBDEUser, // Disable image pasting for BDE users
                paste_enable_default_filters: !isBDEUser, // Block default paste filters for BDE users
                paste_block_drop: isBDEUser, // Block drag/drop for BDE users
                paste_preprocess: (plugin, args) => {
                  if (isBDEUser) {
                    // Remove any image tags from pasted content for BDE users
                    args.content = args.content.replace(/<img[^>]*>/g, '');
                    args.content = args.content.replace(/data:image[^"']*/g, '');
                  }
                },
                // TinyMCE 8.0+ uses built-in paste handling - deprecated options removed
                table_default_attributes: {
                  border: '1'
                },
                table_default_styles: {
                  'border-collapse': 'collapse',
                  'width': '100%'
                },
                table_class_list: [
                  { title: 'None', value: '' },
                  { title: 'Bordered', value: 'table-bordered' },
                  { title: 'Striped', value: 'table-striped' }
                ],
                setup: (editor) => {
                  editor.on('paste', handleEditorPaste);
                  editor.on('PastePostProcess', (e) => {
                    console.log('🎯 TinyMCE PastePostProcess - Table processed!');
                    console.log('🎯 Final content length:', e.node.innerHTML.length);
                  });
                  editor.on('PastePreProcess', (e) => {
                    console.log('🎯 TinyMCE PastePreProcess - Before processing');
                  });
                }
              }}
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">{attachment.name}</span>
                    <span className="text-xs text-gray-500">({(attachment.size / 1024).toFixed(1)} KB)</span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="w-2 h-2 text-gray-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!canSendAttachments || loadingAttachmentPermission}
              className={`p-2 rounded-full transition-colors ${
                canSendAttachments && !loadingAttachmentPermission
                  ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              title={
                canSendAttachments
                  ? 'Attach files'
                  : 'You do not have permission to send attachments'
              }
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowMailMerge(!showMailMerge)}
              className="px-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span>Mail Merge</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || to.length === 0 || !subject.trim()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileAttachment}
          className="hidden"
        />

        {/* Mail Merge Panel */}
        {showMailMerge && (
          <div className="border-t border-gray-200">
            <MailMerge
              onRecipientsSelected={(recipients) => {
                const newEmails = recipients.filter(email => !to.includes(email) && !cc.includes(email));
                setTo([...to, ...newEmails]);
                setShowMailMerge(false);
              }}
              onClose={() => setShowMailMerge(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ComposeEmailTinyMCE;