// Setup script to configure Firebase Storage CORS
// Run this script to fix CORS issues with Firebase Storage

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 Setting up Firebase Storage CORS configuration...');

try {
  // Check if gsutil is available
  execSync('gsutil version', { stdio: 'pipe' });
  console.log('✅ gsutil is available');
  
  // Apply CORS configuration
  console.log('📝 Applying CORS configuration to Firebase Storage...');
  execSync('gsutil cors set cors.json gs://clutch-21069.firebasestorage.app', { stdio: 'inherit' });
  
  console.log('✅ CORS configuration applied successfully!');
  console.log('🚀 You can now upload images without CORS errors.');
  
} catch (error) {
  console.error('❌ Error setting up CORS:', error.message);
  console.log('\n📋 Manual setup instructions:');
  console.log('1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install');
  console.log('2. Run: gcloud auth login');
  console.log('3. Run: gsutil cors set cors.json gs://clutch-21069.firebasestorage.app');
  console.log('\nOr use the Firebase Console:');
  console.log('1. Go to Firebase Console > Storage');
  console.log('2. Go to Rules tab');
  console.log('3. Update the rules to allow CORS');
}
