const testTrashBehavior = async () => {
  console.log('🧪 Testing Trash Behavior - Email Permanent Delete\n');

  try {
    // Step 1: Setup test users
    console.log('Step 1: Setting up test users...');
    
    // Create sender
    const senderResponse = await fetch('http://localhost:5050/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Sender',
        email: 'test.sender@company.com',
        password: 'password123',
        role: 'employee',
        department: 'IT'
      })
    });
    const sender = await senderResponse.json();
    console.log('✅ Sender created:', sender.id);

    // Create recipient
    const recipientResponse = await fetch('http://localhost:5050/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Recipient',
        email: 'test.recipient@company.com',
        password: 'password123',
        role: 'employee',
        department: 'IT'
      })
    });
    const recipient = await recipientResponse.json();
    console.log('✅ Recipient created:', recipient.id);

    // Step 2: Send test email
    console.log('\nStep 2: Sending test email...');
    const emailResponse = await fetch('http://localhost:5050/api/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: sender.id,
        recipientIds: [recipient.id],
        subject: 'Test Email for Trash Behavior',
        body: 'This email will be used to test trash behavior and permanent deletion.',
        priority: 'normal'
      })
    });
    const testEmail = await emailResponse.json();
    console.log('✅ Test email sent:', testEmail.id);

    // Step 3: Verify email is in recipient's inbox
    console.log('\nStep 3: Verifying email is in recipient inbox...');
    const inboxResponse = await fetch(`http://localhost:5050/api/emails?userId=${recipient.id}`);
    const inboxEmails = await inboxResponse.json();
    const emailInInbox = inboxEmails.find(email => email.id === testEmail.id);
    console.log('✅ Email in recipient inbox:', emailInInbox ? 'YES' : 'NO');

    // Step 4: Move email to trash (delete)
    console.log('\nStep 4: Moving email to trash...');
    const deleteResponse = await fetch(`http://localhost:5050/api/emails/${testEmail.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: recipient.id })
    });
    console.log('✅ Email moved to trash:', deleteResponse.ok ? 'YES' : 'NO');

    // Step 5: Verify email is in trash
    console.log('\nStep 5: Verifying email is in trash...');
    const trashResponse = await fetch(`http://localhost:5050/api/trash?userId=${recipient.id}`);
    const trashEmails = await trashResponse.json();
    const emailInTrash = trashEmails.find(email => email.id === testEmail.id);
    console.log('✅ Email in trash:', emailInTrash ? 'YES' : 'NO');

    // Step 6: Verify email is NOT in inbox
    console.log('\nStep 6: Verifying email is NOT in inbox...');
    const inboxAfterDeleteResponse = await fetch(`http://localhost:5050/api/emails?userId=${recipient.id}`);
    const inboxEmailsAfterDelete = await inboxAfterDeleteResponse.json();
    const emailStillInInbox = inboxEmailsAfterDelete.find(email => email.id === testEmail.id);
    console.log('✅ Email still in inbox:', emailStillInInbox ? 'YES' : 'NO');

    // Step 7: Permanently delete from trash
    console.log('\nStep 7: Permanently deleting from trash...');
    const permanentDeleteResponse = await fetch(`http://localhost:5050/api/trash/${testEmail.id}/permanent`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: recipient.id })
    });
    console.log('✅ Email permanently deleted:', permanentDeleteResponse.ok ? 'YES' : 'NO');

    // Step 8: Verify email is NOT in trash
    console.log('\nStep 8: Verifying email is NOT in trash...');
    const trashAfterPermanentResponse = await fetch(`http://localhost:5050/api/trash?userId=${recipient.id}`);
    const trashEmailsAfterPermanent = await trashAfterPermanentResponse.json();
    const emailStillInTrash = trashEmailsAfterPermanent.find(email => email.id === testEmail.id);
    console.log('✅ Email still in trash:', emailStillInTrash ? 'YES' : 'NO');

    // Step 9: Verify email is NOT in inbox (this is the key test)
    console.log('\nStep 9: Verifying email is NOT back in inbox...');
    const inboxAfterPermanentResponse = await fetch(`http://localhost:5050/api/emails?userId=${recipient.id}`);
    const inboxEmailsAfterPermanent = await inboxAfterPermanentResponse.json();
    const emailBackInInbox = inboxEmailsAfterPermanent.find(email => email.id === testEmail.id);
    console.log('❌ Email back in inbox (THIS SHOULD BE NO):', emailBackInInbox ? 'YES' : 'NO');

    // Step 10: Check if sender can still see the email
    console.log('\nStep 10: Checking if sender can still see sent email...');
    const sentResponse = await fetch(`http://localhost:5050/api/emails/sent?userId=${sender.id}`);
    const sentEmails = await sentResponse.json();
    const emailInSent = sentEmails.find(email => email.id === testEmail.id);
    console.log('✅ Email still in sender sent items:', emailInSent ? 'YES' : 'NO');

    // Step 11: Check if email still exists in database (admin view)
    console.log('\nStep 11: Checking if email still exists in database...');
    try {
      const adminResponse = await fetch(`http://localhost:5050/api/admin/emails/${testEmail.id}?adminUserId=${sender.id}`);
      const adminEmail = adminResponse.ok ? await adminResponse.json() : null;
      console.log('✅ Email exists in database:', adminEmail ? 'YES' : 'NO');
    } catch (error) {
      console.log('✅ Email exists in database: NO (or admin access denied)');
    }

    console.log('\n🎯 Test Summary:');
    console.log('- Email should NOT be in recipient inbox after permanent delete from trash');
    console.log('- Email should NOT be in recipient trash after permanent delete');
    console.log('- Email should still exist in database for other users');
    console.log('- Email should still be in sender sent items');

    if (emailBackInInbox) {
      console.log('\n❌ BUG CONFIRMED: Email is appearing back in inbox after permanent delete from trash!');
    } else {
      console.log('\n✅ No bug detected: Email is correctly NOT in inbox after permanent delete');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testTrashBehavior();