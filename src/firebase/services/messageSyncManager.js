// Centralized message sync manager to prevent duplicate notifications
import { collection, query, where, onSnapshot, orderBy, limit, getDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../config';
import notificationService from '../../services/notificationService';

class MessageSyncManager {
  constructor() {
    this.listeners = new Map();
    this.isActive = false;
    this.currentUserId = null;
    this.onNewMessage = null;
    this.onChatUpdate = null;
  }

  // Start global message sync for a user
  startSync(userId, onNewMessage, onChatUpdate) {
    console.log('MessageSyncManager: Starting sync for user:', userId);
    
    // If already syncing for the same user, don't start again
    if (this.isActive && this.currentUserId === userId) {
      console.log('MessageSyncManager: Already syncing for this user, skipping');
      return;
    }

    // Clean up existing listeners
    this.stopSync();

    this.currentUserId = userId;
    this.onNewMessage = onNewMessage;
    this.onChatUpdate = onChatUpdate;
    this.isActive = true;

    this.setupAllUserChatsSync();
  }

  // Stop all message sync listeners
  stopSync() {
    console.log('MessageSyncManager: Stopping all sync listeners');
    
    // Unsubscribe from all listeners
    this.listeners.forEach((unsubscribe, chatId) => {
      unsubscribe();
    });
    
    this.listeners.clear();
    this.isActive = false;
    this.currentUserId = null;
    this.onNewMessage = null;
    this.onChatUpdate = null;
  }

  // Setup sync for all potential chats for the current user
  async setupAllUserChatsSync() {
    if (!this.currentUserId || !this.isActive) return;

    try {
      console.log('MessageSyncManager: Setting up all user chats sync for:', this.currentUserId);
      
      // Get all users to create potential chat IDs
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const allUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('MessageSyncManager: Found', allUsers.length, 'users');

      // Create potential chat IDs for each user
      for (const user of allUsers) {
        if (user.id !== this.currentUserId) {
          const userIds = [this.currentUserId, user.id].sort();
          const chatId = `direct_${userIds[0]}_${userIds[1]}`;
          
          // Only set up listener if not already listening to this chat
          if (!this.listeners.has(chatId)) {
            this.setupDirectChatSync(chatId);
          }
        }
      }
    } catch (error) {
      console.error('MessageSyncManager: Error setting up all user chats sync:', error);
    }
  }

  // Setup direct chat sync for a specific chat
  setupDirectChatSync(chatId) {
    if (!this.currentUserId || !this.isActive) return;

    console.log('MessageSyncManager: Setting up direct chat sync for:', chatId);

    try {
      const chatsRef = collection(db, 'messages', chatId, 'chats');
      const q = query(chatsRef, orderBy('timestamp', 'desc'), limit(10)); // Get more messages for better detection

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!this.isActive) return;

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const messageData = change.doc.data();
            
            console.log('MessageSyncManager: Raw message data from Firebase:', messageData);
            console.log('MessageSyncManager: Message ID:', change.doc.id);
            console.log('MessageSyncManager: Sender ID:', messageData.senderId);
            console.log('MessageSyncManager: Current user ID:', this.currentUserId);
            
            // Only notify if message is from someone else
            if (messageData.senderId !== this.currentUserId) {
              console.log('MessageSyncManager: New message detected in chat:', chatId);
              console.log('MessageSyncManager: Message content:', messageData.content);
              console.log('MessageSyncManager: Message sender:', messageData.senderId);
              
              // Check if message is recent (within last 2 minutes) - more lenient
              const messageTime = messageData.timestamp?.toDate();
              const now = new Date();
              const timeDiff = now - messageTime;
              
              console.log('MessageSyncManager: Message time:', messageTime);
              console.log('MessageSyncManager: Time difference (ms):', timeDiff);
              
              if (timeDiff < 120000) { // 2 minutes - more lenient
                console.log('MessageSyncManager: Message is recent, showing notification');
                
                const fullMessageData = {
                  id: change.doc.id,
                  ...messageData,
                  chatId: chatId
                };

                // Get sender profile and show notification
                this.getSenderProfileAndNotify(fullMessageData);
              } else {
                console.log('MessageSyncManager: Message is too old, skipping notification');
              }
            } else {
              console.log('MessageSyncManager: Skipping message - from current user');
            }
          }
        });
      });

      this.listeners.set(chatId, unsubscribe);
    } catch (error) {
      console.error('MessageSyncManager: Error setting up direct chat sync:', error);
    }
  }

  // Get sender profile and show notification
  async getSenderProfileAndNotify(messageData) {
    try {
      console.log('MessageSyncManager: Getting sender profile for:', messageData.senderId);
      console.log('MessageSyncManager: Full message data:', messageData);
      
      const senderProfile = await this.getSenderProfile(messageData.senderId);
      console.log('MessageSyncManager: Sender profile:', senderProfile);
      
      const senderName = senderProfile?.username || senderProfile?.name || 'Someone';
      const messageContent = messageData.content || messageData.text || 'New message';
      const notificationMessage = `${senderName}: ${messageContent}`;
      
      console.log('MessageSyncManager: Showing notification:', notificationMessage);
      console.log('MessageSyncManager: Chat ID:', messageData.chatId);
      
      // Use the reliable notification service
      notificationService.showNotification(notificationMessage, messageData.chatId);
      
      // Also call the original handler if available (for backward compatibility)
      if (this.onNewMessage) {
        this.onNewMessage({
          chatId: messageData.chatId,
          senderId: messageData.senderId,
          senderName: senderName,
          content: messageContent,
          message: messageData
        });
      }
    } catch (error) {
      console.error('MessageSyncManager: Error getting sender profile:', error);
      
      // Show notification even if we can't get sender profile
      const messageContent = messageData.content || messageData.text || 'New message';
      const notificationMessage = `Someone: ${messageContent}`;
      notificationService.showNotification(notificationMessage, messageData.chatId);
      
      if (this.onNewMessage) {
        this.onNewMessage({
          chatId: messageData.chatId,
          senderId: messageData.senderId,
          senderName: 'Someone',
          content: messageContent,
          message: messageData
        });
      }
    }
  }

  // Helper function to get sender profile
  async getSenderProfile(senderId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', senderId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('MessageSyncManager: Error fetching sender profile:', error);
      return null;
    }
  }

  // Add a new chat listener (for new matches)
  addChatListener(chatId) {
    if (!this.listeners.has(chatId)) {
      this.setupDirectChatSync(chatId);
    }
  }

  // Remove a specific chat listener
  removeChatListener(chatId) {
    if (this.listeners.has(chatId)) {
      const unsubscribe = this.listeners.get(chatId);
      unsubscribe();
      this.listeners.delete(chatId);
    }
  }

  // Get current sync status
  getStatus() {
    return {
      isActive: this.isActive,
      currentUserId: this.currentUserId,
      listenerCount: this.listeners.size,
      chatIds: Array.from(this.listeners.keys())
    };
  }
}

// Create a singleton instance
const messageSyncManager = new MessageSyncManager();

// Export the singleton instance
export default messageSyncManager;

// Export convenience functions
export const startMessageSync = (userId, onNewMessage, onChatUpdate) => {
  messageSyncManager.startSync(userId, onNewMessage, onChatUpdate);
};

export const stopMessageSync = () => {
  messageSyncManager.stopSync();
};

export const addChatListener = (chatId) => {
  messageSyncManager.addChatListener(chatId);
};

export const getSyncStatus = () => {
  return messageSyncManager.getStatus();
};

// Test notification function
export const testNotification = () => {
  console.log('Testing notification system...');
  notificationService.showNotification('Test notification from MessageSyncManager', 'test-chat');
};
