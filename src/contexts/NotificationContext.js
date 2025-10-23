import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children, currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [latestMessage, setLatestMessage] = useState(null);

  // Simple notification system that works with the current setup
  useEffect(() => {
    if (!currentUser?.id) return;

    console.log('Setting up simplified notification system for user:', currentUser.id);
    
    // For now, we'll use a simple approach that doesn't rely on complex Firebase queries
    // The notification will be handled by the individual chat components
    setUnreadCount(0);
    
    return () => {
      console.log('Notification system cleaned up');
    };
  }, [currentUser?.id]);

  const clearNotification = () => {
    setShowNotification(false);
    setLatestMessage(null);
  };

  const value = {
    notifications,
    unreadCount,
    showNotification,
    latestMessage,
    clearNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Global Notification Toast */}
      {showNotification && latestMessage && (
        <div className="fixed top-4 right-4 z-50 bg-valorant-red text-white p-4 rounded-lg shadow-lg max-w-sm animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-valorant-red text-lg">💬</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold">New Message</p>
              <p className="text-sm opacity-90">{latestMessage.content}</p>
            </div>
            <button
              onClick={clearNotification}
              className="text-white hover:text-gray-300 text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
