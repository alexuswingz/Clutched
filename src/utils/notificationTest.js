// Test utility for notification system
import globalNotificationManager from '../services/globalNotificationManager';

// Test function to verify notification deduplication
export const testNotificationDeduplication = () => {
  console.log('🧪 Testing notification deduplication...');
  
  // Test 1: Same message should only show once
  console.log('Test 1: Sending same message multiple times');
  globalNotificationManager.showNotification('Test message 1', 'chat1', 'msg1');
  globalNotificationManager.showNotification('Test message 1', 'chat1', 'msg1'); // Should be ignored
  globalNotificationManager.showNotification('Test message 1', 'chat1', 'msg1'); // Should be ignored
  
  // Test 2: Different messages should show
  console.log('Test 2: Sending different messages');
  setTimeout(() => {
    globalNotificationManager.showNotification('Test message 2', 'chat1', 'msg2');
  }, 2000);
  
  setTimeout(() => {
    globalNotificationManager.showNotification('Test message 3', 'chat2', 'msg3');
  }, 4000);
  
  // Test 3: Same content, different chat should show
  setTimeout(() => {
    globalNotificationManager.showNotification('Test message 1', 'chat2', 'msg4');
  }, 6000);
  
  // Test 4: Check status
  setTimeout(() => {
    const status = globalNotificationManager.getStatus();
    console.log('📊 Notification Manager Status:', status);
  }, 8000);
};

// Test function to verify queue management
export const testNotificationQueue = () => {
  console.log('🧪 Testing notification queue...');
  
  // Send multiple notifications quickly
  for (let i = 0; i < 5; i++) {
    globalNotificationManager.showNotification(`Queue test message ${i}`, `chat${i}`, `msg${i}`);
  }
  
  // Check status after a delay
  setTimeout(() => {
    const status = globalNotificationManager.getStatus();
    console.log('📊 Queue Status:', status);
  }, 3000);
};

// Test function to verify chat clearing
export const testChatClearing = () => {
  console.log('🧪 Testing chat clearing...');
  
  // Send notifications for chat1
  globalNotificationManager.showNotification('Message for chat1', 'chat1', 'msg1');
  globalNotificationManager.showNotification('Another message for chat1', 'chat1', 'msg2');
  
  // Clear notifications for chat1
  setTimeout(() => {
    globalNotificationManager.clearNotifiedMessages('chat1');
    console.log('✅ Cleared notifications for chat1');
    
    // Try to send same messages again - should work now
    globalNotificationManager.showNotification('Message for chat1', 'chat1', 'msg1');
    globalNotificationManager.showNotification('Another message for chat1', 'chat1', 'msg2');
  }, 2000);
};

// Run all tests
export const runAllNotificationTests = () => {
  console.log('🚀 Running all notification tests...');
  
  // Reset the manager first
  globalNotificationManager.reset();
  
  // Run tests with delays
  testNotificationDeduplication();
  
  setTimeout(() => {
    testNotificationQueue();
  }, 10000);
  
  setTimeout(() => {
    testChatClearing();
  }, 20000);
  
  // Final status check
  setTimeout(() => {
    const status = globalNotificationManager.getStatus();
    console.log('📊 Final Status:', status);
    console.log('✅ All tests completed!');
  }, 30000);
};

// Export test functions for manual testing
export default {
  testNotificationDeduplication,
  testNotificationQueue,
  testChatClearing,
  runAllNotificationTests
};
