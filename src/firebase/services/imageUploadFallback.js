// Fallback image upload service using base64 encoding
// This bypasses CORS issues by storing images as base64 in Firestore

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config';

/**
 * Convert file to base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} - Base64 string
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

/**
 * Upload image as base64 to Firestore (CORS-free alternative)
 * @param {File} file - The image file to upload
 * @param {string} userId - The user ID
 * @param {string} type - The type of image (avatar, agent, etc.)
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadImageAsBase64 = async (file, userId, type = 'avatar') => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' };
    }

    // Validate file size (max 2MB for base64 to avoid Firestore limits)
    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: 'File size must be less than 2MB for base64 storage' };
    }

    // Convert to base64
    const base64String = await fileToBase64(file);
    
    // Create a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${type}_${timestamp}.${fileExtension}`;
    
    // Store in Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      [`customImages.${fileName}`]: base64String,
      [`customImages.${type}_current`]: base64String,
      [`customImages.${type}_updated`]: new Date()
    });
    
    console.log('Image stored as base64 successfully');
    return { success: true, url: base64String };
    
  } catch (error) {
    console.error('Error storing image as base64:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get base64 image from Firestore
 * @param {string} userId - The user ID
 * @param {string} type - The type of image (avatar, agent, etc.)
 * @returns {Promise<string|null>} - Base64 string or null
 */
export const getBase64Image = async (userId, type = 'avatar') => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.customImages?.[`${type}_current`] || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting base64 image:', error);
    return null;
  }
};
