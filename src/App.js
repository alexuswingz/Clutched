import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WelcomeScreen from './components/WelcomeScreen';
import HomeScreen from './components/HomeScreen';
import ProfileScreen from './components/ProfileScreen';
import ChatScreen from './components/ChatScreen';
import GlobalChatScreen from './components/GlobalChatScreen';
import LoginScreen from './components/LoginScreen';
import { createUserProfile, updateUserProfile, setUserOffline } from './firebase/services/userService';
import { clearInvalidUserCache } from './firebase/services/resetService';
import SimpleToast from './components/SimpleToast';
import { ToastProvider, useToast } from './contexts/ToastContext';

function AppContent() {
  const [currentUser, setCurrentUser] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast, toastMessage, showNotification, hideToast } = useToast();
  
  // Debug toast state
  useEffect(() => {
    console.log('App.js - showToast:', showToast, 'toastMessage:', toastMessage);
  }, [showToast, toastMessage]);

  // Expose toast context globally for notification service
  useEffect(() => {
    window.toastContext = { showNotification };
    return () => {
      delete window.toastContext;
    };
  }, [showNotification]);

  // Handle page visibility changes for active status
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (currentUser?.id) {
        if (document.hidden) {
          // Page is hidden, set user as offline
          try {
            await setUserOffline(currentUser.id);
          } catch (error) {
            console.error('Error setting user offline on page hide:', error);
          }
        } else {
          // Page is visible, set user as online
          try {
            const { setUserOnline } = await import('./firebase/services/userService');
            await setUserOnline(currentUser.id);
          } catch (error) {
            console.error('Error setting user online on page show:', error);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set user offline when page is about to unload
    const handleBeforeUnload = async () => {
      if (currentUser?.id) {
        try {
          await setUserOffline(currentUser.id);
        } catch (error) {
          console.error('Error setting user offline on page unload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser?.id]);
  


  // Load user data from localStorage on app start
  useEffect(() => {
    const loadUserData = async () => {
      const savedUser = localStorage.getItem('clutched_user');
      const savedProfile = localStorage.getItem('clutched_hasProfile');
      
      if (savedUser && savedProfile === 'true') {
        try {
          const userData = JSON.parse(savedUser);
          
          // Skip Firebase validation for developer accounts
          if (userData.isDeveloper) {
            console.log('Developer account detected, skipping Firebase validation');
            setCurrentUser(userData);
            setHasProfile(true);
          } else {
            // Check if user still exists in Firebase for regular users
            try {
              const cacheResult = await clearInvalidUserCache();
              
              if (cacheResult.success && cacheResult.cleared) {
                console.log('Invalid user cache cleared, redirecting to welcome screen');
                setCurrentUser(null);
                setHasProfile(false);
              } else {
                // User is valid, load from cache
                console.log('User validation successful, loading from cache');
                setCurrentUser(userData);
                setHasProfile(true);
              }
            } catch (error) {
              console.error('Error validating user cache, loading from cache anyway:', error);
              // If validation fails, still load from cache to prevent losing user data
              // This ensures users don't lose their session due to network issues
              setCurrentUser(userData);
              setHasProfile(true);
            }
          }
        } catch (error) {
          console.error('Error validating user cache:', error);
          // Clear corrupted data
          localStorage.removeItem('clutched_user');
          localStorage.removeItem('clutched_hasProfile');
        }
      }
      setIsLoading(false);
    };

    loadUserData();
  }, []);

  const handleProfileCreate = async (userData) => {
    setCurrentUser(userData);
    setHasProfile(true);
    // Save to localStorage
    localStorage.setItem('clutched_user', JSON.stringify(userData));
    localStorage.setItem('clutched_hasProfile', 'true');
    
    // Save to Firebase
    try {
      await createUserProfile(userData);
      console.log('Profile saved to Firebase successfully');
    } catch (error) {
      console.error('Error saving profile to Firebase:', error);
    }
  };

  const handleLogout = async () => {
    // Set user as offline before logging out
    if (currentUser?.id) {
      try {
        await setUserOffline(currentUser.id);
      } catch (error) {
        console.error('Error setting user offline on logout:', error);
      }
    }
    
    setCurrentUser(null);
    setHasProfile(false);
    // Clear from localStorage
    localStorage.removeItem('clutched_user');
    localStorage.removeItem('clutched_hasProfile');
  };

  const handleProfileUpdate = async (updatedUser) => {
    setCurrentUser(updatedUser);
    // Update localStorage
    localStorage.setItem('clutched_user', JSON.stringify(updatedUser));
    
    // Update Firebase
    try {
      await updateUserProfile(updatedUser.id, updatedUser);
      console.log('Profile updated in Firebase successfully');
    } catch (error) {
      console.error('Error updating profile in Firebase:', error);
    }
  };

  // Show loading screen while checking localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen bg-valorant-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-valorant-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Clutched...</p>
        </div>
      </div>
    );
  }

    return (
      <Router>
        <div className="min-h-screen bg-valorant-dark">
          <Routes>
            <Route 
              path="/" 
              element={
                hasProfile ? 
                  <Navigate to="/home" replace /> : 
                  <WelcomeScreen onProfileCreate={handleProfileCreate} />
              } 
            />
            <Route 
              path="/home" 
              element={
                hasProfile ? 
                  <HomeScreen currentUser={currentUser} /> : 
                  <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/profile" 
              element={
                hasProfile ? 
                  <ProfileScreen currentUser={currentUser} onLogout={handleLogout} onProfileUpdate={handleProfileUpdate} /> : 
                  <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/chat" 
              element={
                hasProfile ? 
                  <ChatScreen currentUser={currentUser} /> : 
                  <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/global-chat" 
              element={
                hasProfile ? 
                  <GlobalChatScreen currentUser={currentUser} /> : 
                  <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/login" 
              element={<LoginScreen />} 
            />
          </Routes>
          
          {/* Simple Toast Notification */}
          <SimpleToast 
            message={toastMessage} 
            show={showToast} 
            onClose={hideToast} 
          />
          
        </div>
      </Router>
    );
  }

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
