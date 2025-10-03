const axios = require('axios');

async function testAttachmentAPI() {
  try {
    console.log('Testing API endpoints for attachments...');
    
    // Test getting emails for manager-2 (the recipient of our test email)
    console.log('\n1. Testing /api/emails?userId=manager-2 endpoint...');
    const emailsResponse = await axios.get('http://localhost:3001/api/emails?userId=manager-2');
    console.log(`Status: ${emailsResponse.status}`);
    console.log(`Found ${emailsResponse.data.length} emails for manager-2`);
    
    // Find the email with attachment
    const emailWithAttachment = emailsResponse.data.find(email => email.id === '1759059580286');
    if (emailWithAttachment) {
      console.log('\n2. Found the test email with attachment:');
      console.log(`- ID: ${emailWithAttachment.id}`);
      console.log(`- Subject: ${emailWithAttachment.subject}`);
      console.log(`- Sender ID: ${emailWithAttachment.senderId}`);
      console.log(`- Recipients: ${emailWithAttachment.recipientIds.join(', ')}`);
      console.log(`- Has attachments field: ${!!emailWithAttachment.attachments}`);
      console.log(`- Attachments count: ${emailWithAttachment.attachments ? emailWithAttachment.attachments.length : 0}`);
      
      if (emailWithAttachment.attachments && emailWithAttachment.attachments.length > 0) {
        emailWithAttachment.attachments.forEach((att, i) => {
          console.log(`  Attachment ${i+1}: ${att.name} (${att.size} bytes, ${att.type})`);
        });
      }
    } else {
      console.log('\n2. Test email with attachment not found in API response');
      
      // Show all emails to debug
      console.log('\nAll emails for manager-2:');
      emailsResponse.data.forEach(email => {
        console.log(`- ID: ${email.id}, Subject: ${email.subject}, Has attachments: ${!!email.attachments && email.attachments.length > 0}`);
      });
    }

    // Test getting email by ID
    console.log('\n3. Testing /api/emails/1759059580286 endpoint...');
    try {
      const emailResponse = await axios.get('http://localhost:3001/api/emails/1759059580286');
      console.log(`Status: ${emailResponse.status}`);
      const email = emailResponse.data;
      console.log(`Email subject: ${email.subject}`);
      console.log(`Has attachments: ${!!email.attachments}`);
      if (email.attachments) {
        console.log(`Attachments: ${email.attachments.length}`);
        email.attachments.forEach((att, i) => {
          console.log(`  ${i+1}. ${att.name} (${att.size} bytes)`);
        });
      }
    } catch (error) {
      console.log(`Error getting email by ID: ${error.response?.status || error.message}`);
    }

  } catch (error) {
    console.error('API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAttachmentAPI();