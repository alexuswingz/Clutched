// Global chat service for community messaging
import { collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../config';
import { containsProfanity, filterProfanity } from '../../utils/profanityFilter';

// Send a message to global chat
export const sendGlobalMessage = async (senderId, senderName, content, senderAvatar = null, senderAge = null, senderGender = null) => {
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
    
    const docRef = await addDoc(collection(db, 'globalChat'), {
      senderId,
      senderName,
      content,
      senderAvatar,
      senderAge,
      senderGender,
      timestamp: serverTimestamp(),
      read: false
    });
    
    console.log('Global message sent successfully:', docRef.id);
    return { success: true, messageId: docRef.id };
  } catch (error) {
    console.error('Error sending global message:', error);
    return { success: false, error };
  }
};

// Get real-time global chat messages
export const getGlobalChatMessages = (callback) => {
  try {
    const messagesRef = collection(db, 'globalChat');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50)); // Get last 50 messages
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
        };
      }).reverse(); // Reverse to show oldest first
      
      if (callback && typeof callback === 'function') {
        callback(messages);
      }
    }, (error) => {
      console.error('Error in global chat messages:', error);
      if (callback && typeof callback === 'function') {
        callback([]);
      }
    });
  } catch (error) {
    console.error('Error setting up global chat listener:', error);
    if (callback && typeof callback === 'function') {
      callback([]);
    }
  }
};

// Get global chat stats (total messages, active users, etc.)
export const getGlobalChatStats = async () => {
  try {
    const messagesRef = collection(db, 'globalChat');
    const snapshot = await getDocs(messagesRef);
    
    const totalMessages = snapshot.size;
    const uniqueUsers = new Set();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.senderId) {
        uniqueUsers.add(data.senderId);
      }
    });
    
    return {
      success: true,
      totalMessages,
      uniqueUsers: uniqueUsers.size,
      lastMessage: snapshot.docs[0]?.data() || null
    };
  } catch (error) {
    console.error('Error getting global chat stats:', error);
    return { success: false, error };
  }
};
