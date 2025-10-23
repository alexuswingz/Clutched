// Message service for Firebase operations
import { collection, addDoc, query, orderBy, onSnapshot, getDocs, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config';
import { containsProfanity } from '../../utils/profanityFilter';

// Send a message
export const sendMessage = async (chatId, senderId, content, participants = []) => {
  try {
    // Check for profanity
    if (containsProfanity(content)) {
      console.log('Message contains profanity, blocking:', content);
      return { 
        success: false, 
        error: 'Message contains inappropriate language. Please use respectful language.',
        blocked: true 
      };
    }
    
    const docRef = await addDoc(collection(db, 'messages', chatId, 'chats'), {
      senderId,
      content,
      timestamp: new Date(),
      read: false,
      participants: participants.length > 0 ? participants : [senderId] // Include participants for global listening
    });
    
    
    return { success: true };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error };
  }
};

// Get real-time messages for a chat
export const getChatMessages = (chatId, callback) => {
  try {
    const messagesRef = collection(db, 'messages', chatId, 'chats');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
      
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        // Only log in development mode to reduce console spam
        if (process.env.NODE_ENV === 'development') {
          console.log('Processing message:', {
            id: doc.id,
            senderId: data.senderId,
            content: data.content,
            timestamp: data.timestamp,
            read: data.read
          });
        }
        return {
          id: doc.id,
          ...data
        };
      });
      
      if (callback && typeof callback === 'function') {
        callback(messages);
      }
    }, (error) => {
      console.error('Error in real-time messages for chatId:', chatId, error);
      // Return empty array on error to prevent crashes
      if (callback && typeof callback === 'function') {
        callback([]);
      }
    });
  } catch (error) {
    console.error('Error setting up message listener for chatId:', chatId, error);
    // Return empty array on error
    if (callback && typeof callback === 'function') {
      callback([]);
    }
  }
};

// Mark messages as read
export const markMessagesAsRead = async (chatId, userId) => {
  try {
    
    const messagesRef = collection(db, 'messages', chatId, 'chats');
    // Get all messages and filter in JavaScript to avoid composite index requirement
    const allMessagesQuery = query(messagesRef, orderBy('timestamp', 'desc'));
    const allMessagesSnapshot = await getDocs(allMessagesQuery);
    
    // Filter unread messages from other users in JavaScript
    const unreadMessages = allMessagesSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.senderId !== userId && data.read === false;
    });
    
    
    let updatedCount = 0;
    const updatePromises = [];
    
    for (const docSnapshot of unreadMessages) {
      const updatePromise = updateDoc(docSnapshot.ref, {
        read: true,
        readAt: new Date()
      });
      updatePromises.push(updatePromise);
      updatedCount++;
    }
    
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    
    return { success: true, updatedCount };
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return { success: false, error };
  }
};

// Clear all messages (for testing)
export const clearAllMessages = async () => {
  try {
    // This would require deleting all documents in the messages collection
    return { success: true };
  } catch (error) {
    console.error('Error clearing messages:', error);
    return { success: false, error };
  }
};
