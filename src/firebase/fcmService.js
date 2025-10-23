// Firebase Cloud Messaging service for push notifications
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './config';

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(app);

// VAPID key for web push (you'll need to get this from Firebase Console)
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE'; // Replace with your actual VAPID key

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    console.log('Requesting notification permission...');
    
    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });
      
      if (token) {
        console.log('FCM token:', token);
        return { success: true, token };
      } else {
        console.log('No registration token available');
        return { success: false, error: 'No token available' };
      }
    } else {
      console.log('Notification permission denied');
      return { success: false, error: 'Permission denied' };
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return { success: false, error: error.message };
  }
};

// Listen for foreground messages
export const setupForegroundMessageListener = (onMessageReceived) => {
  try {
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      
      // Show notification
      if (payload.notification) {
        const notification = new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/images/jett.jpg', // Use your app icon
          badge: '/images/jett.jpg',
          tag: 'clutched-message',
          requireInteraction: true,
          actions: [
            {
              action: 'open',
              title: 'Open Chat'
            },
            {
              action: 'close',
              title: 'Close'
            }
          ]
        });

        // Handle notification click
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          
          // Navigate to chat if specified
          if (payload.data?.chatId) {
            window.location.href = `/chat?chatId=${payload.data.chatId}`;
          } else {
            window.location.href = '/home';
          }
          
          notification.close();
        };

        // Auto-close after 10 seconds
        setTimeout(() => {
          notification.close();
        }, 10000);
      }

      // Call custom handler
      if (onMessageReceived) {
        onMessageReceived(payload);
      }
    });
  } catch (error) {
    console.error('Error setting up foreground message listener:', error);
  }
};

// Check if notifications are supported
export const isNotificationSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// Check current permission status
export const getNotificationPermission = () => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
};

// Save FCM token to user profile
export const saveFCMToken = async (userId, token) => {
  try {
    // You can save this to Firebase or your backend
    console.log('Saving FCM token for user:', userId, 'Token:', token);
    
    // For now, just log it. You can implement saving to Firebase here
    localStorage.setItem('fcm_token', token);
    
    return { success: true };
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return { success: false, error: error.message };
  }
};

// Send notification to user (this would typically be done from your backend)
export const sendNotificationToUser = async (userId, title, body, data = {}) => {
  try {
    // This is a placeholder - in reality, you'd send this from your backend
    // using Firebase Admin SDK or FCM REST API
    console.log('Sending notification to user:', userId);
    console.log('Title:', title, 'Body:', body, 'Data:', data);
    
    // For demo purposes, show a local notification
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: '/images/jett.jpg',
        badge: '/images/jett.jpg',
        tag: 'clutched-message',
        data: data
      });
      
      notification.onclick = () => {
        window.focus();
        if (data.chatId) {
          window.location.href = `/chat?chatId=${data.chatId}`;
        }
        notification.close();
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
};
