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

async function checkRecipientView() {
  try {
    // Find emails where manager-2 is a recipient
    const recipientId = 'manager-2';
    const emailsForRecipient = await Email.find({ 
      recipientIds: { $in: [recipientId] } 
    });
    
    console.log(`Emails for recipient ${recipientId}:`);
    emailsForRecipient.forEach(email => {
      console.log(`- ID: ${email.id}`);
      console.log(`  Subject: ${email.subject}`);
      console.log(`  Sender: ${email.senderId}`);
      console.log(`  Recipients: ${email.recipientIds.join(', ')}`);
      console.log(`  Has attachments: ${email.attachments && email.attachments.length > 0}`);
      if (email.attachments && email.attachments.length > 0) {
        email.attachments.forEach((att, i) => {
          console.log(`    Attachment ${i+1}: ${att.name} (${att.size} bytes, ${att.type})`);
        });
      }
      console.log('');
    });

    // Specifically check the email with attachment
    const emailWithAttachment = await Email.findOne({ id: '1759059580286' });
    if (emailWithAttachment) {
      console.log('Email with attachment details:');
      console.log(`- ID: ${emailWithAttachment.id}`);
      console.log(`- Subject: ${emailWithAttachment.subject}`);
      console.log(`- Sender: ${emailWithAttachment.senderId}`);
      console.log(`- Recipients: ${emailWithAttachment.recipientIds.join(', ')}`);
      console.log(`- Is manager-2 a recipient? ${emailWithAttachment.recipientIds.includes('manager-2')}`);
      console.log(`- Attachments count: ${emailWithAttachment.attachments.length}`);
      emailWithAttachment.attachments.forEach((att, i) => {
        console.log(`  Attachment ${i+1}: ${att.name} (${att.size} bytes, ${att.type})`);
      });
    }

  } catch (error) {
    console.error('Error checking recipient view:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkRecipientView();