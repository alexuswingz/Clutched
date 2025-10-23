// Image upload service for Firebase Storage
import { ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../config';
import { uploadImageAsBase64 } from './imageUploadFallback';

/**
 * Upload an image file to Firebase Storage
 * @param {File} file - The image file to upload
 * @param {string} userId - The user ID for the folder structure
 * @param {string} type - The type of image (avatar, agent, etc.)
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadImage = async (file, userId, type = 'avatar') => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' };
    }

    // Validate file size (max 5MB for Firebase Storage, 2MB for base64)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File size must be less than 5MB' };
    }

    // Check if we're in development and should skip Firebase Storage
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
      console.log('Development environment detected, using base64 fallback directly');
      return await uploadImageAsBase64(file, userId, type);
    }

    // Create a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${type}_${timestamp}.${fileExtension}`;
    
    // Create storage reference
    const storageRef = ref(storage, `users/${userId}/${fileName}`);
    
    // Try Firebase Storage upload
    let snapshot;
    try {
      console.log('Attempting Firebase Storage upload...');
      snapshot = await uploadBytes(storageRef, file);
      console.log('Firebase Storage upload successful');
    } catch (storageError) {
      console.warn('Firebase Storage failed, using base64 fallback:', storageError.message);
      // Immediately use base64 fallback for any storage error
      return await uploadImageAsBase64(file, userId, type);
    }
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('Image uploaded successfully:', downloadURL);
    return { success: true, url: downloadURL };
    
  } catch (error) {
    console.error('Error uploading image:', error);
    
    // Always try base64 fallback for any error
    console.warn('Upload failed, trying base64 fallback...');
    try {
      return await uploadImageAsBase64(file, userId, type);
    } catch (fallbackError) {
      console.error('Base64 fallback also failed:', fallbackError);
      return { success: false, error: 'All upload methods failed: ' + fallbackError.message };
    }
  }
};

/**
 * Delete an image from Firebase Storage
 * @param {string} imageUrl - The URL of the image to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteImage = async (imageUrl) => {
  try {
    // Extract the path from the URL
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
    
    if (!pathMatch) {
      return { success: false, error: 'Invalid image URL' };
    }
    
    const imagePath = decodeURIComponent(pathMatch[1]);
    const imageRef = ref(storage, imagePath);
    
    await deleteObject(imageRef);
    
    console.log('Image deleted successfully');
    return { success: true };
    
  } catch (error) {
    console.error('Error deleting image:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get a preview URL for an image file (for preview before upload)
 * @param {File} file - The image file
 * @returns {string} - The preview URL
 */
export const getImagePreview = (file) => {
  return URL.createObjectURL(file);
};

/**
 * Revoke a preview URL to free up memory
 * @param {string} previewUrl - The preview URL to revoke
 */
export const revokeImagePreview = (previewUrl) => {
  URL.revokeObjectURL(previewUrl);
};
