// Global message service for real-time updates across all screens
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config';

// Global message listener that works across all screens
export const setupGlobalMessageListener = (currentUserId, onNewMessage) => {
  console.log('Setting up global message listener for user:', currentUserId);
  
  try {
    // Listen to all messages where the user is a participant
    const messagesRef = collection(db, 'messages');
    
    // We need to listen to all message collections and filter by participants
    // This is a simplified approach - in production you might want to use a different structure
    const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
      console.log('Global message listener received update:', snapshot.docs.length, 'collections');
      
      // Process each message collection
      snapshot.docs.forEach(doc => {
        const chatId = doc.id;
        console.log('Processing chat collection:', chatId);
        
        // Check if this chat involves the current user
        if (chatId.includes(currentUserId)) {
          console.log('Chat involves current user, setting up listener for:', chatId);
          
          // Set up listener for this specific chat
          const chatMessagesRef = collection(db, 'messages', chatId, 'chats');
          const q = query(chatMessagesRef, orderBy('timestamp', 'desc'), limit(1));
          
          onSnapshot(q, (messageSnapshot) => {
            if (!messageSnapshot.empty) {
              const latestMessage = messageSnapshot.docs[0].data();
              console.log('Global listener received new message:', latestMessage);
              
              // Only trigger if message is from someone else
              if (latestMessage.senderId !== currentUserId) {
                console.log('New message from other user, triggering callback');
                onNewMessage({
                  chatId,
                  message: latestMessage,
                  senderId: latestMessage.senderId,
                  content: latestMessage.content,
                  timestamp: latestMessage.timestamp
                });
              }
            }
          });
        }
      });
    }, (error) => {
      console.error('Error in global message listener:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up global message listener:', error);
    return () => {};
  }
};

// Alternative approach using direct chat monitoring
export const setupDirectChatListener = (currentUserId, onNewMessage) => {
  console.log('Setting up direct chat listener for user:', currentUserId);
  
  try {
    // Monitor all direct chats for this user
    const directChats = [];
    
    // Find all possible chat IDs for this user
    // This is a simplified approach - you might want to maintain a list of active chats
    const findChatsForUser = async () => {
      // This would need to be implemented based on your chat structure
      // For now, we'll use a different approach
      console.log('Finding chats for user:', currentUserId);
    };
    
    findChatsForUser();
    
    return () => {};
  } catch (error) {
    console.error('Error setting up direct chat listener:', error);
    return () => {};
  }
};
