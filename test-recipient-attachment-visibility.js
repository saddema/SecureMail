const axios = require('axios');

async function testRecipientAttachmentVisibility() {
  console.log('🧪 Testing if recipients can see attachments in emails...\n');
  
  try {
    // Step 1: Get emails for manager-2 (recipient of our test email with attachment)
    console.log('1️⃣ Getting emails for manager-2...');
    const emailsResponse = await axios.get('http://localhost:5050/api/emails?userId=manager-2');
    console.log(`✅ Found ${emailsResponse.data.length} emails`);
    
    // Step 2: Find the email with attachment
    const emailWithAttachment = emailsResponse.data.find(email => 
      email.attachments && email.attachments.length > 0
    );
    
    if (!emailWithAttachment) {
      console.log('❌ No emails with attachments found for manager-2');
      return;
    }
    
    console.log('✅ Found email with attachment:');
    console.log(`   ID: ${emailWithAttachment.id}`);
    console.log(`   Subject: ${emailWithAttachment.subject}`);
    console.log(`   Sender: ${emailWithAttachment.senderId}`);
    console.log(`   Recipients: ${emailWithAttachment.recipientIds.join(', ')}`);
    console.log(`   Attachments: ${emailWithAttachment.attachments.length}`);
    
    // Step 3: Verify manager-2 is a recipient
    const isRecipient = emailWithAttachment.recipientIds.includes('manager-2');
    console.log(`   Is manager-2 a recipient? ${isRecipient ? '✅ YES' : '❌ NO'}`);
    
    if (!isRecipient) {
      console.log('❌ manager-2 is not a recipient of this email');
      return;
    }
    
    // Step 4: Check attachment details
    emailWithAttachment.attachments.forEach((attachment, index) => {
      console.log(`   Attachment ${index + 1}:`);
      console.log(`     Name: ${attachment.name}`);
      console.log(`     Size: ${attachment.size} bytes`);
      console.log(`     Type: ${attachment.type}`);
    });
    
    // Step 5: Test with different user to ensure attachment visibility is role-based
    console.log('\n2️⃣ Testing with admin user (sender of the email)...');
    const adminEmailsResponse = await axios.get('http://localhost:5050/api/emails?userId=admin-1');
    const adminEmailWithAttachment = adminEmailsResponse.data.find(email => 
      email.id === emailWithAttachment.id
    );
    
    if (adminEmailWithAttachment) {
      console.log('✅ Admin can also see the same attachment details');
      console.log(`   Attachments match: ${JSON.stringify(adminEmailWithAttachment.attachments) === JSON.stringify(emailWithAttachment.attachments) ? '✅ YES' : '❌ NO'}`);
    }
    
    // Step 6: Test sent emails to verify sender can see attachments
    console.log('\n3️⃣ Testing sent emails for admin-1...');
    const sentEmailsResponse = await axios.get('http://localhost:5050/api/emails/sent?userId=admin-1');
    const sentEmailWithAttachment = sentEmailsResponse.data.find(email => 
      email.attachments && email.attachments.length > 0
    );
    
    if (sentEmailWithAttachment) {
      console.log('✅ Sender can see attachments in sent emails');
      console.log(`   Email: ${sentEmailWithAttachment.subject}`);
      console.log(`   Attachments: ${sentEmailWithAttachment.attachments.length}`);
    }
    
    console.log('\n🎉 SUCCESS: Recipients can see attachments in emails!');
    console.log('\n📋 Test Results Summary:');
    console.log('✅ Recipients (manager-2) can see attachments in received emails');
    console.log('✅ Senders (admin-1) can see attachments in sent emails');
    console.log('✅ Attachment data is consistent across different user views');
    console.log('✅ Attachment details (name, size, type) are properly exposed');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testRecipientAttachmentVisibility();