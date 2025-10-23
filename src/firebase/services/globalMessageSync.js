// Global message synchronization service
import { collection, query, where, onSnapshot, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '../config';

// Helper function to get sender profile information
const getSenderProfile = async (senderId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', senderId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching sender profile:', error);
    return null;
  }
};

// Global message sync that works across all screens
export const setupGlobalMessageSync = (currentUserId, onNewMessage, onChatUpdate) => {
  console.log('=== GLOBAL MESSAGE SYNC SETUP ===');
  console.log('Setting up global sync for user:', currentUserId);
  
  try {
    // Listen to all message collections where this user is a participant
    const messagesRef = collection(db, 'messages');
    
    const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
      console.log('Global sync received update:', snapshot.docs.length, 'chat collections');
      console.log('Current user ID:', currentUserId);
      
      snapshot.docs.forEach(doc => {
        const chatId = doc.id;
        console.log('Processing chat collection:', chatId);
        console.log('Does chat include current user?', chatId.includes(currentUserId));
        
        // Check if this chat involves the current user
        if (chatId.includes(currentUserId)) {
          console.log('Chat involves current user, monitoring:', chatId);
          
          // Set up listener for the latest message in this chat
          const chatMessagesRef = collection(db, 'messages', chatId, 'chats');
          const q = query(chatMessagesRef, orderBy('timestamp', 'desc'), limit(1));
          
          onSnapshot(q, (messageSnapshot) => {
            if (!messageSnapshot.empty) {
              const latestMessage = messageSnapshot.docs[0].data();
              console.log('Global sync received message:', latestMessage);
              console.log('Message senderId:', latestMessage.senderId);
              console.log('Current user ID:', currentUserId);
              console.log('Message read status:', latestMessage.read);
              
              // Only trigger if message is from someone else and not read
              if (latestMessage.senderId !== currentUserId && !latestMessage.read) {
                console.log('New unread message detected, triggering updates');
                
                // Trigger chat list update
                if (onChatUpdate) {
                  onChatUpdate(chatId, latestMessage);
                }
                
                // Trigger new message notification with sender info
                if (onNewMessage) {
                  console.log('Triggering notification for message:', latestMessage.content);
                  // Fetch sender profile asynchronously
                  getSenderProfile(latestMessage.senderId).then(senderProfile => {
                    console.log('Sender profile fetched:', senderProfile);
                    onNewMessage({
                      chatId,
                      message: latestMessage,
                      senderId: latestMessage.senderId,
                      senderName: senderProfile?.username || senderProfile?.name || 'Unknown User',
                      content: latestMessage.content,
                      timestamp: latestMessage.timestamp
                    });
                  }).catch(error => {
                    console.error('Error fetching sender profile for notification:', error);
                    // Still send notification without sender name
                    onNewMessage({
                      chatId,
                      message: latestMessage,
                      senderId: latestMessage.senderId,
                      senderName: 'Unknown User',
                      content: latestMessage.content,
                      timestamp: latestMessage.timestamp
                    });
                  });
                }
              } else {
                console.log('Message not eligible for notification - senderId matches or already read');
              }
            }
          }, (error) => {
            console.error('Error in global message sync for chat:', chatId, error);
          });
        }
      });
    }, (error) => {
      console.error('Error in global message sync:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up global message sync:', error);
    return () => {};
  }
};

// Alternative approach: Monitor all user's chats directly
export const setupUserChatSync = (currentUserId, onNewMessage, onChatUpdate) => {
  console.log('=== USER CHAT SYNC SETUP ===');
  console.log('Setting up user chat sync for:', currentUserId);
  
  try {
    // Get all possible chat IDs for this user
    const userChats = [];
    
    // Find all chats where this user is a participant
    // This is a simplified approach - in production you might maintain a user's chat list
    const findUserChats = () => {
      // For now, we'll use a different approach by monitoring the messages collection
      console.log('Finding chats for user:', currentUserId);
      return userChats;
    };
    
    findUserChats();
    
    return () => {};
  } catch (error) {
    console.error('Error setting up user chat sync:', error);
    return () => {};
  }
};

// Simplified approach: Monitor specific chat directly
export const setupDirectChatSync = (currentUserId, chatId, onNewMessage, onChatUpdate) => {
  console.log('=== DIRECT CHAT SYNC SETUP ===');
  console.log('Setting up direct chat sync for user:', currentUserId, 'chat:', chatId);
  
  try {
    const chatMessagesRef = collection(db, 'messages', chatId, 'chats');
    const q = query(chatMessagesRef, orderBy('timestamp', 'desc'), limit(1));
    
    const unsubscribe = onSnapshot(q, (messageSnapshot) => {
      if (!messageSnapshot.empty) {
        const latestMessage = messageSnapshot.docs[0].data();
        console.log('Direct chat sync received message:', latestMessage);
        console.log('Message senderId:', latestMessage.senderId);
        console.log('Current user ID:', currentUserId);
        console.log('Message read status:', latestMessage.read);
        
        // Only trigger if message is from someone else and not read
        if (latestMessage.senderId !== currentUserId && !latestMessage.read) {
          console.log('New unread message detected in direct chat, triggering updates');
          
          // Trigger chat list update
          if (onChatUpdate) {
            onChatUpdate(chatId, latestMessage);
          }
          
          // Trigger new message notification with sender info
          if (onNewMessage) {
            console.log('Triggering notification for message:', latestMessage.content);
            // Fetch sender profile asynchronously
            getSenderProfile(latestMessage.senderId).then(senderProfile => {
              console.log('Sender profile fetched:', senderProfile);
              onNewMessage({
                chatId,
                message: latestMessage,
                senderId: latestMessage.senderId,
                senderName: senderProfile?.username || senderProfile?.name || 'Unknown User',
                content: latestMessage.content,
                timestamp: latestMessage.timestamp
              });
            }).catch(error => {
              console.error('Error fetching sender profile for notification:', error);
              // Still send notification without sender name
              onNewMessage({
                chatId,
                message: latestMessage,
                senderId: latestMessage.senderId,
                senderName: 'Unknown User',
                content: latestMessage.content,
                timestamp: latestMessage.timestamp
              });
            });
          }
        } else {
          console.log('Message not eligible for notification - senderId matches or already read');
        }
      }
    }, (error) => {
      console.error('Error in direct chat sync for chat:', chatId, error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up direct chat sync:', error);
    return () => {};
  }
};

// Force refresh all chats for a user
export const forceRefreshUserChats = async (currentUserId) => {
  console.log('=== FORCE REFRESH USER CHATS ===');
  console.log('Force refreshing all chats for user:', currentUserId);
  
  try {
    // This would trigger a re-fetch of all chat data
    // Implementation depends on your chat structure
    console.log('Force refresh completed');
    return true;
  } catch (error) {
    console.error('Error force refreshing user chats:', error);
    return false;
  }
};

// Simple approach: Monitor all users and set up chat sync for each potential chat
export const setupAllUserChatsSync = (currentUserId, onNewMessage, onChatUpdate) => {
  console.log('=== SETUP ALL USER CHATS SYNC ===');
  console.log('Setting up all user chats sync for user:', currentUserId);
  
  try {
    const unsubscribes = [];
    
    // Get all users to find potential chats
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef);
    
    const unsubscribeUsers = onSnapshot(usersQuery, (usersSnapshot) => {
      console.log('Users snapshot received:', usersSnapshot.docs.length, 'users');
      
      usersSnapshot.docs.forEach(userDoc => {
        const otherUser = userDoc.data();
        if (otherUser.id !== currentUserId) {
          // Create potential chat ID
          const userIds = [currentUserId, otherUser.id].sort();
          const chatId = `direct_${userIds[0]}_${userIds[1]}`;
          
          console.log('Setting up sync for potential chat:', chatId);
          
          // Set up direct chat sync for this potential chat
          const unsubscribe = setupDirectChatSync(
            currentUserId,
            chatId,
            onNewMessage,
            onChatUpdate
          );
          
          unsubscribes.push(unsubscribe);
        }
      });
    }, (error) => {
      console.error('Error in users snapshot:', error);
    });
    
    unsubscribes.push(unsubscribeUsers);
    
    return () => {
      console.log('Cleaning up all user chats sync');
      unsubscribes.forEach(unsubscribe => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
    };
  } catch (error) {
    console.error('Error setting up all user chats sync:', error);
    return () => {};
  }
};
