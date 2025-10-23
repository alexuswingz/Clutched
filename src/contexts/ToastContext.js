import React, { createContext, useContext, useState, useEffect } from 'react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [activeChatId, setActiveChatId] = useState(null);
  const [notifiedMessages, setNotifiedMessages] = useState(new Set());

  // Debug state changes
  useEffect(() => {
    console.log('ToastContext: State changed - showToast:', showToast, 'toastMessage:', toastMessage);
  }, [showToast, toastMessage]);

  const showNotification = (message, chatId = null, messageId = null) => {
    console.log('ToastContext: Showing notification:', message, 'for chat:', chatId, 'messageId:', messageId);
    console.log('ToastContext: Active chat ID:', activeChatId);
    
    // Don't show notification if user is currently viewing this chat
    if (chatId && chatId === activeChatId) {
      console.log('ToastContext: Skipping notification - user is viewing this chat');
      return;
    }
    
    // Create a unique key for this message
    const messageKey = messageId ? `${chatId}_${messageId}` : `${chatId}_${message}`;
    
    // Check if we've already notified about this message
    if (notifiedMessages.has(messageKey)) {
      console.log('ToastContext: Skipping notification - already notified about this message');
      return;
    }
    
    // Add this message to the notified set
    setNotifiedMessages(prev => new Set([...prev, messageKey]));
    
    console.log('ToastContext: Before setState - showToast:', showToast, 'toastMessage:', toastMessage);
    setToastMessage(message);
    setShowToast(true);
    console.log('ToastContext: After setState calls');
  };

  const hideToast = () => {
    console.log('ToastContext: Hiding toast');
    setShowToast(false);
  };

  const testNotification = () => {
    showNotification('Test notification from Firebase!');
  };

  const clearNotifiedMessages = (chatId) => {
    console.log('ToastContext: Clearing notified messages for chat:', chatId);
    setNotifiedMessages(prev => {
      const newSet = new Set();
      for (const key of prev) {
        if (!key.startsWith(`${chatId}_`)) {
          newSet.add(key);
        }
      }
      return newSet;
    });
  };

  const value = {
    showToast,
    toastMessage,
    showNotification,
    hideToast,
    testNotification,
    activeChatId,
    setActiveChatId,
    clearNotifiedMessages
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};
