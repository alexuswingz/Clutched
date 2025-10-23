// Global notification manager to prevent duplicate notifications
class GlobalNotificationManager {
  constructor() {
    this.notifiedMessages = new Set();
    this.notificationQueue = [];
    this.isProcessing = false;
    this.lastNotificationTime = 0;
    this.notificationCooldown = 1000; // 1 second between notifications
    this.maxQueueSize = 10; // Prevent memory issues
  }

  // Show notification with global deduplication
  showNotification(message, chatId = null, messageId = null) {
    console.log('GlobalNotificationManager: Received notification:', message, 'Chat ID:', chatId, 'Message ID:', messageId);
    
    // Create a unique key for this message
    const messageKey = this.createMessageKey(messageId, chatId, message);
    
    // Check if we've already notified about this message
    if (this.notifiedMessages.has(messageKey)) {
      console.log('GlobalNotificationManager: Skipping notification - already notified about this message');
      return;
    }
    
    // Add to notified set immediately to prevent duplicates
    this.notifiedMessages.add(messageKey);
    
    // Add to queue for processing
    this.addToQueue({
      message,
      chatId,
      messageId,
      messageKey,
      timestamp: Date.now()
    });
    
    // Process queue
    this.processQueue();
  }

  // Create a unique key for message deduplication
  createMessageKey(messageId, chatId, message) {
    if (messageId) {
      return `msg_${messageId}`;
    }
    if (chatId) {
      return `chat_${chatId}_${message}`;
    }
    return `content_${message}`;
  }

  // Add notification to queue
  addToQueue(notification) {
    // Prevent queue from growing too large
    if (this.notificationQueue.length >= this.maxQueueSize) {
      console.log('GlobalNotificationManager: Queue full, removing oldest notification');
      this.notificationQueue.shift();
    }
    
    this.notificationQueue.push(notification);
    console.log('GlobalNotificationManager: Added to queue, queue size:', this.notificationQueue.length);
  }

  // Process notification queue
  async processQueue() {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log('GlobalNotificationManager: Processing queue with', this.notificationQueue.length, 'notifications');

    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      
      // Check cooldown
      const now = Date.now();
      if (now - this.lastNotificationTime < this.notificationCooldown) {
        // Put back in queue and wait
        this.notificationQueue.unshift(notification);
        await this.delay(this.notificationCooldown - (now - this.lastNotificationTime));
        continue;
      }

      // Show notification
      await this.displayNotification(notification);
      this.lastNotificationTime = now;
    }

    this.isProcessing = false;
    console.log('GlobalNotificationManager: Queue processing complete');
  }

  // Display the actual notification
  async displayNotification(notification) {
    try {
      console.log('GlobalNotificationManager: Displaying notification:', notification.message);
      
      // Try to get the toast context
      const toastContext = this.getToastContext();
      
      if (toastContext) {
        // Use the toast context with the message key for deduplication
        toastContext.showNotification(
          notification.message, 
          notification.chatId, 
          notification.messageId
        );
        console.log('GlobalNotificationManager: Notification sent via toast context');
      } else {
        // Fallback: show browser notification
        this.showBrowserNotification(notification);
        console.log('GlobalNotificationManager: Fallback to browser notification');
      }
    } catch (error) {
      console.error('GlobalNotificationManager: Error displaying notification:', error);
      
      // Final fallback: console log
      console.log('🔔 NOTIFICATION:', notification.message);
    }
  }

  // Get toast context from window (if available)
  getToastContext() {
    try {
      // Try to access the toast context from the global state
      if (window.toastContext) {
        return window.toastContext;
      }
      
      return null;
    } catch (error) {
      console.error('GlobalNotificationManager: Error getting toast context:', error);
      return null;
    }
  }

  // Show browser notification as fallback
  showBrowserNotification(notification) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const browserNotification = new Notification('Clutched - New Message', {
          body: notification.message,
          icon: '/images/jett.jpg',
          badge: '/images/jett.jpg',
          tag: `clutched-${notification.chatId || 'global'}`,
          requireInteraction: true
        });

        browserNotification.onclick = () => {
          window.focus();
          if (notification.chatId) {
            window.location.href = `/chat?chatId=${notification.chatId}`;
          } else {
            window.location.href = '/home';
          }
          browserNotification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
          browserNotification.close();
        }, 5000);
      } else {
        // Final fallback: alert
        alert(`🔔 New Message: ${notification.message}`);
      }
    } catch (error) {
      console.error('GlobalNotificationManager: Error showing browser notification:', error);
      // Ultimate fallback
      alert(`🔔 New Message: ${notification.message}`);
    }
  }

  // Delay utility
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clear all pending notifications
  clearQueue() {
    this.notificationQueue = [];
    this.isProcessing = false;
    console.log('GlobalNotificationManager: Queue cleared');
  }

  // Clear notified messages for a specific chat (when user enters chat)
  clearNotifiedMessages(chatId) {
    console.log('GlobalNotificationManager: Clearing notified messages for chat:', chatId);
    const keysToRemove = [];
    
    for (const key of this.notifiedMessages) {
      if (key.startsWith(`chat_${chatId}_`) || key.startsWith(`msg_`)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => this.notifiedMessages.delete(key));
    console.log('GlobalNotificationManager: Removed', keysToRemove.length, 'notified messages');
  }

  // Get manager status
  getStatus() {
    return {
      queueLength: this.notificationQueue.length,
      isProcessing: this.isProcessing,
      lastNotificationTime: this.lastNotificationTime,
      notifiedCount: this.notifiedMessages.size
    };
  }

  // Reset the manager (useful for testing)
  reset() {
    this.notifiedMessages.clear();
    this.notificationQueue = [];
    this.isProcessing = false;
    this.lastNotificationTime = 0;
    console.log('GlobalNotificationManager: Reset complete');
  }
}

// Create singleton instance
const globalNotificationManager = new GlobalNotificationManager();

// Export the manager
export default globalNotificationManager;

// Export convenience function
export const showGlobalNotification = (message, chatId, messageId) => {
  globalNotificationManager.showNotification(message, chatId, messageId);
};

// Export manager for advanced usage
export { globalNotificationManager };
