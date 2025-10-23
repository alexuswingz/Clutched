// User service for Firebase operations
import { doc, setDoc, getDoc, updateDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config';

// Create or update user profile
export const createUserProfile = async (userData) => {
  try {
    await setDoc(doc(db, 'users', userData.id), {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('User profile created successfully in Firebase');
    return { success: true };
  } catch (error) {
    console.error('Error creating user profile:', error);
    // Don't throw error, just log it and continue with localStorage
    return { success: false, error };
  }
};

// Update user profile
export const updateUserProfile = async (userId, userData) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...userData,
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error };
  }
};

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error };
  }
};

// Get all users except current user (for discovery)
export const getDiscoveryUsers = (currentUserId, callback) => {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef, 
    orderBy('createdAt', 'desc') // Show newest users first
  );
  
  return onSnapshot(q, (snapshot) => {
    const allUsers = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(user => user.id !== currentUserId); // Filter out current user in JavaScript
    
    // Custom ordering: Developer account first, then newest users
    const sortedUsers = allUsers.sort((a, b) => {
      // Developer account (admin.jpg avatar) goes first
      const aIsDeveloper = a.avatar === "/images/admin.jpg";
      const bIsDeveloper = b.avatar === "/images/admin.jpg";
      
      if (aIsDeveloper && !bIsDeveloper) return -1;
      if (!aIsDeveloper && bIsDeveloper) return 1;
      
      // For non-developer accounts, sort by creation date (newest first)
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return bDate - aDate;
    });
    
    // Ensure developer account is at the very beginning
    const developerAccount = sortedUsers.find(user => 
      user.avatar === "/images/admin.jpg" || 
      user.username === "Developer" || 
      user.id === "dev_1761178419119"
    );
    const otherUsers = sortedUsers.filter(user => 
      user.avatar !== "/images/admin.jpg" && 
      user.username !== "Developer" && 
      user.id !== "dev_1761178419119"
    );
    
    const finalSortedUsers = developerAccount ? [developerAccount, ...otherUsers] : otherUsers;
    
    console.log('Discovery users ordered: Developer first, then newest users:', finalSortedUsers.length);
    console.log('First user (should be developer):', finalSortedUsers[0]?.username, finalSortedUsers[0]?.avatar);
    if (callback && typeof callback === 'function') {
      callback(finalSortedUsers);
    }
  }, (error) => {
    console.error('Error in user discovery:', error);
    if (callback && typeof callback === 'function') {
      callback([]);
    }
  });
};
