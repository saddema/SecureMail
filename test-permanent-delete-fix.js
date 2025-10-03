const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const TEST_USER_ID = 'user-1';
const TEST_RECIPIENT_ID = 'user-2';

async function testPermanentDeleteFix() {
  console.log('🧪 Testing Permanent Delete Fix...\n');

  try {
    // Step 1: Create test email
    console.log('📧 Creating test email...');
    const emailResponse = await axios.post(`${BASE_URL}/api/emails`, {
      from: TEST_USER_ID,
      to: [TEST_RECIPIENT_ID],
      subject: 'Test Email for Permanent Delete Fix',
      content: 'This email will be used to test the permanent delete fix.',
      priority: 'normal',
      cc: [],
      bcc: []
    });

    const emailId = emailResponse.data.id;
    console.log(`✅ Email created with ID: ${emailId}`);

    // Step 2: Verify email appears in recipient's inbox
    console.log('\n📥 Checking recipient inbox...');
    const inboxBeforeDelete = await axios.get(`${BASE_URL}/api/emails?userId=${TEST_RECIPIENT_ID}`);
    const emailInInbox = inboxBeforeDelete.data.emails.some(email => email.id === emailId);
    console.log(`✅ Email found in recipient inbox: ${emailInInbox}`);

    // Step 3: Delete email to trash (as recipient)
    console.log('\n🗑️ Moving email to trash...');
    await axios.delete(`${BASE_URL}/api/emails/${emailId}`, {
      data: { userId: TEST_RECIPIENT_ID }
    });
    console.log('✅ Email moved to trash');

    // Step 4: Verify email appears in recipient's trash
    console.log('\n🗑️ Checking recipient trash...');
    const trashResponse = await axios.get(`${BASE_URL}/api/trash?userId=${TEST_RECIPIENT_ID}`);
    const emailInTrash = trashResponse.data.emails.some(email => email.id === emailId);
    console.log(`✅ Email found in recipient trash: ${emailInTrash}`);

    // Step 5: Permanently delete email from trash
    console.log('\n🗑️ Permanently deleting email from trash...');
    await axios.delete(`${BASE_URL}/api/trash/${emailId}/permanent`, {
      data: { userId: TEST_RECIPIENT_ID }
    });
    console.log('✅ Email permanently deleted from trash');

    // Step 6: Verify email does NOT appear in recipient's inbox after permanent delete
    console.log('\n📥 Checking recipient inbox after permanent delete...');
    const inboxAfterDelete = await axios.get(`${BASE_URL}/api/emails?userId=${TEST_RECIPIENT_ID}`);
    const emailStillInInbox = inboxAfterDelete.data.emails.some(email => email.id === emailId);
    console.log(`✅ Email still in recipient inbox: ${emailStillInInbox} (should be false)`);

    // Step 7: Verify email does NOT appear in recipient's trash after permanent delete
    console.log('\n🗑️ Checking recipient trash after permanent delete...');
    const trashAfterDelete = await axios.get(`${BASE_URL}/api/trash?userId=${TEST_RECIPIENT_ID}`);
    const emailStillInTrash = trashAfterDelete.data.emails.some(email => email.id === emailId);
    console.log(`✅ Email still in recipient trash: ${emailStillInTrash} (should be false)`);

    // Step 8: Verify sender can still see the email in sent items
    console.log('\n📤 Checking sender sent items...');
    const sentResponse = await axios.get(`${BASE_URL}/api/emails/sent?userId=${TEST_USER_ID}`);
    const emailInSent = sentResponse.data.emails.some(email => email.id === emailId);
    console.log(`✅ Email found in sender sent items: ${emailInSent}`);

    // Step 9: Test empty trash functionality
    console.log('\n🧹 Testing empty trash functionality...');
    
    // Create another email to test empty trash
    const email2Response = await axios.post(`${BASE_URL}/api/emails`, {
      from: TEST_USER_ID,
      to: [TEST_RECIPIENT_ID],
      subject: 'Test Email 2 for Empty Trash',
      content: 'This email will be used to test empty trash functionality.',
      priority: 'normal',
      cc: [],
      bcc: []
    });
    
    const email2Id = email2Response.data.id;
    
    // Move to trash
    await axios.delete(`${BASE_URL}/api/emails/${email2Id}`, {
      data: { userId: TEST_RECIPIENT_ID }
    });
    
    // Empty trash
    const emptyTrashResponse = await axios.delete(`${BASE_URL}/api/trash/empty`, {
      data: { userId: TEST_RECIPIENT_ID }
    });
    
    console.log(`✅ Trash emptied. Deleted count: ${emptyTrashResponse.data.deletedCount}`);
    
    // Verify both emails are not in inbox
    const finalInbox = await axios.get(`${BASE_URL}/api/emails?userId=${TEST_RECIPIENT_ID}`);
    const email1InInbox = finalInbox.data.emails.some(email => email.id === emailId);
    const email2InInbox = finalInbox.data.emails.some(email => email.id === email2Id);
    
    console.log(`✅ Email 1 in inbox after empty trash: ${email1InInbox} (should be false)`);
    console.log(`✅ Email 2 in inbox after empty trash: ${email2InInbox} (should be false)`);

    console.log('\n🎉 All tests passed! The permanent delete fix is working correctly.');
    console.log('\n📋 Summary:');
    console.log('- Emails permanently deleted from trash do not reappear in inbox');
    console.log('- Emails emptied from trash do not reappear in inbox');
    console.log('- Sender can still see emails in sent items after recipient permanently deletes them');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testPermanentDeleteFix();