// Database reset service for Firebase operations
import { collection, getDocs, deleteDoc, doc, setDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../config';

// Clear all messages from database
export const clearAllMessages = async () => {
  try {
    console.log('Clearing all messages from database...');
    
    // Get all message collections
    const messagesRef = collection(db, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);
    
    let deletedCount = 0;
    for (const messageDoc of messagesSnapshot.docs) {
      // Get all chat subcollections
      const chatsRef = collection(db, 'messages', messageDoc.id, 'chats');
      const chatsSnapshot = await getDocs(chatsRef);
      
      // Delete all chat messages
      for (const chatDoc of chatsSnapshot.docs) {
        await deleteDoc(doc(db, 'messages', messageDoc.id, 'chats', chatDoc.id));
        deletedCount++;
      }
      
      // Delete the message collection itself
      await deleteDoc(doc(db, 'messages', messageDoc.id));
    }
    
    console.log(`Cleared ${deletedCount} messages from database`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error('Error clearing messages:', error);
    return { success: false, error };
  }
};

// Clear all users from database
export const clearAllUsers = async () => {
  try {
    console.log('Clearing all users from database...');
    
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let deletedCount = 0;
    for (const userDoc of usersSnapshot.docs) {
      await deleteDoc(doc(db, 'users', userDoc.id));
      deletedCount++;
    }
    
    console.log(`Cleared ${deletedCount} users from database`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error('Error clearing users:', error);
    return { success: false, error };
  }
};

// Clear localStorage cache for invalid users
export const clearInvalidUserCache = async () => {
  try {
    console.log('Clearing invalid user cache...');
    
    // Get current user from localStorage
    const savedUser = localStorage.getItem('clutched_user');
    const savedProfile = localStorage.getItem('clutched_hasProfile');
    
    if (savedUser && savedProfile === 'true') {
      try {
        const userData = JSON.parse(savedUser);
        
        // Check if user still exists in Firebase with timeout
        const userDoc = await Promise.race([
          getDoc(doc(db, 'users', userData.id)),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Firebase validation timeout')), 5000)
          )
        ]);
        
        if (!userDoc.exists()) {
          console.log('User no longer exists in Firebase, clearing cache...');
          
          // Clear all localStorage data
          localStorage.removeItem('clutched_user');
          localStorage.removeItem('clutched_hasProfile');
          
          // Clear swiped users data
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('clutched_swiped_')) {
              localStorage.removeItem(key);
            }
          });
          
          console.log('Cache cleared for invalid user');
          return { success: true, cleared: true };
        } else {
          console.log('User still exists in Firebase');
          return { success: true, cleared: false };
        }
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        // Clear corrupted data
        localStorage.removeItem('clutched_user');
        localStorage.removeItem('clutched_hasProfile');
        return { success: true, cleared: true };
      }
    }
    
    return { success: true, cleared: false };
  } catch (error) {
    console.error('Error clearing invalid user cache:', error);
    return { success: false, error };
  }
};

// Clear all localStorage cache
export const clearAllLocalStorage = () => {
  try {
    console.log('Clearing all localStorage cache...');
    
    // Clear all clutched-related localStorage items
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('clutched_')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('All localStorage cache cleared');
    return { success: true };
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return { success: false, error };
  }
};

// Delete user account and all associated data
export const deleteUserAccount = async (userId) => {
  try {
    console.log('Deleting user account:', userId);
    
    // 1. Delete all messages where user is a participant
    const messagesRef = collection(db, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);
    
    let deletedMessages = 0;
    for (const messageDoc of messagesSnapshot.docs) {
      const chatId = messageDoc.id;
      
      // Check if this chat involves the user
      if (chatId.includes(userId)) {
        // Get all chat messages
        const chatsRef = collection(db, 'messages', chatId, 'chats');
        const chatsSnapshot = await getDocs(chatsRef);
        
        // Delete all chat messages
        for (const chatDoc of chatsSnapshot.docs) {
          await deleteDoc(doc(db, 'messages', chatId, 'chats', chatDoc.id));
          deletedMessages++;
        }
        
        // Delete the message collection itself
        await deleteDoc(doc(db, 'messages', chatId));
      }
    }
    
    // 2. Delete all matches involving this user
    const matchesRef = collection(db, 'matches');
    const matchesSnapshot = await getDocs(matchesRef);
    
    let deletedMatches = 0;
    for (const matchDoc of matchesSnapshot.docs) {
      const matchData = matchDoc.data();
      if (matchData.user1Id === userId || matchData.user2Id === userId) {
        await deleteDoc(doc(db, 'matches', matchDoc.id));
        deletedMatches++;
      }
    }
    
    // 3. Delete user profile
    await deleteDoc(doc(db, 'users', userId));
    
    // 4. Clear localStorage cache
    clearAllLocalStorage();
    
    console.log(`Account deleted successfully:
      - User profile: 1
      - Messages: ${deletedMessages}
      - Matches: ${deletedMatches}
      - Local cache: cleared`);
    
    return { 
      success: true, 
      deletedMessages, 
      deletedMatches 
    };
  } catch (error) {
    console.error('Error deleting user account:', error);
    return { success: false, error };
  }
};

// Clear all matches from database
export const clearAllMatches = async () => {
  try {
    console.log('Clearing all matches from database...');
    
    const matchesRef = collection(db, 'matches');
    const matchesSnapshot = await getDocs(matchesRef);
    
    let deletedCount = 0;
    for (const matchDoc of matchesSnapshot.docs) {
      await deleteDoc(doc(db, 'matches', matchDoc.id));
      deletedCount++;
    }
    
    console.log(`Cleared ${deletedCount} matches from database`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error('Error clearing matches:', error);
    return { success: false, error };
  }
};

// Update existing Alexus Karl account with correct avatar
export const updateAlexusKarlAvatar = async () => {
  try {
    console.log('Updating Alexus Karl avatar...');
    
    const alexusId = 'dev_1761178419119';
    const alexusRef = doc(db, 'users', alexusId);
    
    // Update the avatar and agentImage fields
    await updateDoc(alexusRef, {
      avatar: '/images/jett.jpg',
      agentImage: '/images/jett.jpg',
      updatedAt: new Date()
    });
    
    console.log('Alexus Karl avatar updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error updating Alexus Karl avatar:', error);
    return { success: false, error };
  }
};

// Create developer account and return user data for auto-login
export const createDeveloperAccount = async () => {
  try {
    console.log('Creating developer account...');
    
    const developerId = 'dev_' + Date.now();
    const developerData = {
      id: developerId,
      username: 'Alexus Karl',
      name: 'Alexus Karl',
      bio: 'Valorant is better with duo',
      location: 'Nueva Ecija',
      age: 25,
      gender: 'Male',
      favoriteAgent: 'Jett',
      rank: 'Gold',
      avatar: '/images/jett.jpg',
      agentImage: '/images/jett.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeveloper: true
    };
    
    await setDoc(doc(db, 'users', developerId), developerData);
    console.log('Developer account created successfully:', developerId);
    
    return { success: true, developerId, developerData };
  } catch (error) {
    console.error('Error creating developer account:', error);
    return { success: false, error };
  }
};

// Find existing developer account
export const findDeveloperAccount = async () => {
  try {
    console.log('Looking for existing developer account...');
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('isDeveloper', '==', true));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const developerDoc = snapshot.docs[0];
      const developerData = {
        id: developerDoc.id,
        ...developerDoc.data()
      };
      console.log('Found existing developer account:', developerData);
      return { success: true, developerData };
    } else {
      console.log('No existing developer account found');
      return { success: false, error: 'No developer account found' };
    }
  } catch (error) {
    console.error('Error finding developer account:', error);
    return { success: false, error };
  }
};

// Complete database reset
export const resetDatabase = async () => {
  try {
    console.log('Starting complete database reset...');
    
    // Clear all data
    const messagesResult = await clearAllMessages();
    const usersResult = await clearAllUsers();
    const matchesResult = await clearAllMatches();
    
    // Create developer account
    const developerResult = await createDeveloperAccount();
    
    console.log('Database reset completed successfully');
    return {
      success: true,
      results: {
        messages: messagesResult,
        users: usersResult,
        matches: matchesResult,
        developer: developerResult
      }
    };
  } catch (error) {
    console.error('Error resetting database:', error);
    return { success: false, error };
  }
};
