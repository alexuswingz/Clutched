// Test utility to verify image upload fallback
import { uploadImage } from '../firebase/services/imageUploadService';

export const testImageUpload = async () => {
  console.log('🧪 Testing image upload fallback...');
  
  // Create a test file
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';
  ctx.fillText('TEST', 25, 55);
  
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const testFile = new File([blob], 'test.png', { type: 'image/png' });
  
  console.log('📁 Created test file:', testFile.name, testFile.size, 'bytes');
  
  try {
    const result = await uploadImage(testFile, 'test_user', 'avatar');
    console.log('✅ Upload result:', result);
    
    if (result.success) {
      console.log('🎉 Upload successful! URL:', result.url);
      return true;
    } else {
      console.error('❌ Upload failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('💥 Upload error:', error);
    return false;
  }
};

// Make it available globally for testing
window.testImageUpload = testImageUpload;
