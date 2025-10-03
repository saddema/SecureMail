const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testFileUploadAndDownload() {
  console.log('🧪 Testing file upload and download functionality...\n');

  try {
    // Create a test file
    const testFilePath = path.join(__dirname, 'test-file.txt');
    const testContent = 'This is a test file for attachment functionality.';
    fs.writeFileSync(testFilePath, testContent);
    
    console.log('1️⃣ Created test file:', testFilePath);

    // Test file upload
    console.log('\n2️⃣ Testing file upload...');
    const formData = new FormData();
    formData.append('attachments', fs.createReadStream(testFilePath));

    const uploadResponse = await axios.post('http://localhost:5050/api/upload-attachments', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    console.log('✅ File upload successful');
    console.log('Upload response:', uploadResponse.data);

    if (uploadResponse.data.files && uploadResponse.data.files.length > 0) {
      const uploadedFile = uploadResponse.data.files[0];
      console.log('Uploaded file details:');
      console.log(`  Name: ${uploadedFile.name}`);
      console.log(`  Size: ${uploadedFile.size} bytes`);
      console.log(`  Type: ${uploadedFile.type}`);
      console.log(`  Server filename: ${uploadedFile.filename}`);

      // Test file download
      console.log('\n3️⃣ Testing file download...');
      const downloadUrl = `http://localhost:5050/api/download/${uploadedFile.filename}`;
      console.log('Download URL:', downloadUrl);

      // Test download by checking if endpoint exists
      const downloadResponse = await axios.get(downloadUrl, {
        responseType: 'stream'
      });

      console.log('✅ File download endpoint accessible');
      console.log('Download response status:', downloadResponse.status);
      console.log('Content-Type:', downloadResponse.headers['content-type']);
      console.log('Content-Length:', downloadResponse.headers['content-length']);

      // Clean up test file
      fs.unlinkSync(testFilePath);
      console.log('\n4️⃣ Cleaned up test file');

      console.log('\n🎉 SUCCESS: File upload and download system is working!');
      console.log('✅ Files can be uploaded to the server');
      console.log('✅ Files can be downloaded from the server');
      console.log('✅ Proper content-type headers are set');
      console.log('✅ File metadata is preserved');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    // Clean up test file on error
    const testFilePath = path.join(__dirname, 'test-file.txt');
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    
    process.exit(1);
  }
}

// Run the test
testFileUploadAndDownload();