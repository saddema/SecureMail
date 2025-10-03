// Debug script for attachment permissions endpoint
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5050/api';

async function debugAttachmentPermissions() {
  console.log('🔍 Debugging attachment permissions endpoint...\n');
  
  try {
    // Step 1: Get admin user
    console.log('1️⃣ Getting admin user...');
    const usersResponse = await axios.get(`${API_BASE_URL}/users`);
    const users = usersResponse.data;
    
    const adminUser = users.find(u => u.role === 'admin');
    if (!adminUser) {
      throw new Error('No admin user found');
    }
    
    console.log(`✅ Found admin: ${adminUser.firstName} ${adminUser.lastName} (ID: ${adminUser.id})`);
    
    // Step 2: Test attachment permissions endpoint with different approaches
    console.log('\n2️⃣ Testing attachment permissions endpoint...');
    
    // Test with query parameter
    try {
      console.log(`Testing with adminUserId: ${adminUser.id}`);
      const response = await axios.get(
        `${API_BASE_URL}/users/attachment-permissions?adminUserId=${adminUser.id}`
      );
      console.log('✅ Attachment permissions endpoint working');
      console.log(`Found ${response.data.length} users with attachment permissions`);
    } catch (error) {
      console.log('❌ Attachment permissions endpoint failed');
      console.log('Error status:', error.response?.status);
      console.log('Error data:', error.response?.data);
      
      // Let's try to debug by checking if the admin user can be found directly
      console.log('\n3️⃣ Debugging admin user lookup...');
      try {
        const adminCheck = await axios.get(`${API_BASE_URL}/users/${adminUser.id}`);
        console.log('✅ Admin user found individually:', adminCheck.data.id);
      } catch (error) {
        console.log('❌ Admin user not found individually:', error.response?.data);
      }
      
      // Let's also test the direct user endpoint with the same ID
      console.log('\n4️⃣ Testing direct user endpoint consistency...');
      try {
        const directUserResponse = await axios.get(`${API_BASE_URL}/users/${adminUser.id}`);
        console.log('Direct user response:', {
          id: directUserResponse.data.id,
          role: directUserResponse.data.role,
          firstName: directUserResponse.data.firstName,
          lastName: directUserResponse.data.lastName
        });
      } catch (error) {
        console.log('❌ Direct user endpoint failed:', error.response?.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the debug
debugAttachmentPermissions();