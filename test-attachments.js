const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/internal-email-app')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Connection error:', err));

// Email Schema (simplified)
const emailSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  senderId: { type: String, required: true },
  recipientIds: [{ type: String, required: true }],
  attachments: [{
    name: { type: String, required: true },
    size: { type: Number, required: true },
    type: { type: String, required: true }
  }],
  sentAt: { type: Date, required: true }
});

const Email = mongoose.model('Email', emailSchema);

async function checkAttachments() {
  try {
    // Count total emails
    const totalEmails = await Email.countDocuments();
    console.log('Total emails:', totalEmails);

    // Count emails with attachments
    const emailsWithAttachments = await Email.countDocuments({ 
      attachments: { $exists: true, $ne: [] } 
    });
    console.log('Emails with attachments:', emailsWithAttachments);

    // Get sample emails with attachments
    const sampleEmails = await Email.find({ 
      attachments: { $exists: true, $ne: [] } 
    }).limit(3);
    
    console.log('Sample emails with attachments:');
    sampleEmails.forEach(email => {
      console.log(`- ID: ${email.id}`);
      console.log(`  Subject: ${email.subject}`);
      console.log(`  Sender: ${email.senderId}`);
      console.log(`  Recipients: ${email.recipientIds.join(', ')}`);
      console.log(`  Attachments: ${email.attachments.length}`);
      email.attachments.forEach((att, i) => {
        console.log(`    ${i+1}. ${att.name} (${att.size} bytes, ${att.type})`);
      });
      console.log('');
    });

    // Get all emails to see the structure
    const allEmails = await Email.find().limit(5);
    console.log('Sample emails (checking structure):');
    allEmails.forEach(email => {
      console.log(`- ID: ${email.id}, Subject: ${email.subject}`);
      console.log(`  Has attachments field: ${!!email.attachments}`);
      console.log(`  Attachments count: ${email.attachments ? email.attachments.length : 'N/A'}`);
    });

  } catch (error) {
    console.error('Error checking attachments:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkAttachments();