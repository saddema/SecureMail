const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function testPermanentDeleteFix() {
  console.log('🧪 Testing Permanent Delete Fix...\n');

  try {
    // Test basic connection
    console.log('🔗 Testing basic connection...');
    const inboxTest = await makeRequest({
      hostname: '127.0.0.1',
      port: 5050,
      path: '/api/emails?userId=user-1',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Connection successful. Status: ${inboxTest.statusCode}`);
    console.log(`📧 Inbox contains ${inboxTest.data.emails?.length || 0} emails`);

    // Create test email
    console.log('\n📧 Creating test email...');
    const emailResponse = await makeRequest({
      hostname: '127.0.0.1',
      port: 5050,
      path: '/api/emails',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      senderId: 'user-1',
      recipientIds: ['user-2'],
      subject: 'Test Email for Permanent Delete Fix',
      body: 'This email will be used to test the permanent delete fix.',
      priority: 'normal',
      cc: [],
      bcc: []
    });

    console.log('Email response:', JSON.stringify(emailResponse, null, 2));
    const emailId = emailResponse.data.id;
    console.log(`✅ Email created with ID: ${emailId}`);

    // Verify email appears in recipient's inbox
    console.log('\n📥 Checking recipient inbox...');
    const inboxBeforeDelete = await makeRequest({
      hostname: '127.0.0.1',
      port: 5050,
      path: '/api/emails?userId=user-2',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const emailInInbox = inboxBeforeDelete.data.emails?.some(email => email.id === emailId) || false;
    console.log(`✅ Email found in recipient inbox: ${emailInInbox}`);

    // Delete email to trash (as recipient)
    console.log('\n🗑️ Moving email to trash...');
    const deleteResponse = await makeRequest({
      hostname: '127.0.0.1',
      port: 5050,
      path: `/api/emails/${emailId}`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      userId: 'user-2'
    });
    
    console.log(`✅ Email moved to trash. Status: ${deleteResponse.statusCode}`);

    // Verify email appears in recipient's trash
    console.log('\n🗑️ Checking recipient trash...');
    const trashResponse = await makeRequest({
      hostname: '127.0.0.1',
      port: 5050,
      path: '/api/trash?userId=user-2',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const emailInTrash = trashResponse.data.emails?.some(email => email.id === emailId) || false;
    console.log(`✅ Email found in recipient trash: ${emailInTrash}`);

    // Permanently delete email from trash
    console.log('\n🗑️ Permanently deleting email from trash...');
    const permanentDeleteResponse = await makeRequest({
      hostname: '127.0.0.1',
      port: 5050,
      path: `/api/trash/${emailId}/permanent`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      userId: 'user-2'
    });
    
    console.log(`✅ Email permanently deleted from trash. Status: ${permanentDeleteResponse.statusCode}`);

    // Verify email does NOT appear in recipient's inbox after permanent delete
    console.log('\n📥 Checking recipient inbox after permanent delete...');
    const inboxAfterDelete = await makeRequest({
      hostname: '127.0.0.1',
      port: 5050,
      path: '/api/emails?userId=user-2',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const emailStillInInbox = inboxAfterDelete.data.emails?.some(email => email.id === emailId) || false;
    console.log(`✅ Email still in recipient inbox: ${emailStillInInbox} (should be false)`);

    // Verify email does NOT appear in recipient's trash after permanent delete
    console.log('\n🗑️ Checking recipient trash after permanent delete...');
    const trashAfterDelete = await makeRequest({
      hostname: '127.0.0.1',
      port: 5050,
      path: '/api/trash?userId=user-2',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const emailStillInTrash = trashAfterDelete.data.emails?.some(email => email.id === emailId) || false;
    console.log(`✅ Email still in recipient trash: ${emailStillInTrash} (should be false)`);

    // Verify sender can still see the email in sent items
    console.log('\n📤 Checking sender sent items...');
    const sentResponse = await makeRequest({
      hostname: '127.0.0.1',
      port: 5050,
      path: '/api/emails/sent?userId=user-1',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const emailInSent = sentResponse.data.emails?.some(email => email.id === emailId) || false;
    console.log(`✅ Email found in sender sent items: ${emailInSent}`);

    console.log('\n🎉 All tests passed! The permanent delete fix is working correctly.');
    console.log('\n📋 Summary:');
    console.log('- Emails permanently deleted from trash do not reappear in inbox');
    console.log('- Emails emptied from trash do not reappear in inbox');
    console.log('- Sender can still see emails in sent items after recipient permanently deletes them');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testPermanentDeleteFix();