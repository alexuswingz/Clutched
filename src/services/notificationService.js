// Simple notification service for better reliability
class NotificationService {
  constructor() {
    this.notificationQueue = [];
    this.isProcessing = false;
    this.lastNotificationTime = 0;
    this.notificationCooldown = 2000; // 2 seconds between notifications
  }

  // Show notification with better reliability
  showNotification(message, chatId = null) {
    console.log('NotificationService: Received notification:', message, 'Chat ID:', chatId);
    
    // Add to queue
    this.notificationQueue.push({
      message,
      chatId,
      timestamp: Date.now()
    });

    // Process queue
    this.processQueue();
  }

  // Process notification queue
  async processQueue() {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

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
      await this.displayNotification(notification.message, notification.chatId);
      this.lastNotificationTime = now;
    }

    this.isProcessing = false;
  }

  // Display the actual notification
  async displayNotification(message, chatId) {
    try {
      console.log('NotificationService: Displaying notification:', message);
      
      // Try to get the toast context
      const toastContext = this.getToastContext();
      
      if (toastContext) {
        // Use the toast context
        toastContext.showNotification(message, chatId);
        console.log('NotificationService: Notification sent via toast context');
      } else {
        // Fallback: show browser notification
        this.showBrowserNotification(message, chatId);
        console.log('NotificationService: Fallback to browser notification');
      }
    } catch (error) {
      console.error('NotificationService: Error displaying notification:', error);
      
      // Final fallback: console log
      console.log('🔔 NOTIFICATION:', message);
    }
  }

  // Get toast context from window (if available)
  getToastContext() {
    try {
      // Try to access the toast context from the global state
      if (window.toastContext) {
        return window.toastContext;
      }
      
      // Try to find it in React context
      const reactRoot = document.getElementById('root');
      if (reactRoot && reactRoot._reactInternalFiber) {
        // This is a hack to access React context - not recommended for production
        return null;
      }
      
      return null;
    } catch (error) {
      console.error('NotificationService: Error getting toast context:', error);
      return null;
    }
  }

  // Show browser notification as fallback
  showBrowserNotification(message, chatId) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('Clutched - New Message', {
          body: message,
          icon: '/images/jett.jpg',
          badge: '/images/jett.jpg',
          tag: 'clutched-message',
          requireInteraction: true
        });

        notification.onclick = () => {
          window.focus();
          if (chatId) {
            window.location.href = `/chat?chatId=${chatId}`;
          } else {
            window.location.href = '/home';
          }
          notification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
      } else {
        // Final fallback: alert
        alert(`🔔 New Message: ${message}`);
      }
    } catch (error) {
      console.error('NotificationService: Error showing browser notification:', error);
      // Ultimate fallback
      alert(`🔔 New Message: ${message}`);
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
  }

  // Get queue status
  getStatus() {
    return {
      queueLength: this.notificationQueue.length,
      isProcessing: this.isProcessing,
      lastNotificationTime: this.lastNotificationTime
    };
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Export the service
export default notificationService;

// Export convenience function
export const showNotification = (message, chatId) => {
  notificationService.showNotification(message, chatId);
};
