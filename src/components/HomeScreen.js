import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsersWithActiveStatus, setUserOnline, setUserOffline } from '../firebase/services/userService';
import { createMatch as createMatchService } from '../firebase/services/matchService';
import { startMessageSync, stopMessageSync } from '../firebase/services/messageSyncManager';
import { useToast } from '../contexts/ToastContext';
import globalNotificationManager from '../services/globalNotificationManager';
import { processUsersAvatars, getUserAvatar, getUserAgentImage, isDeveloperAccount, getUserRoleBadge } from '../utils/avatarUtils';

const HomeScreen = ({ currentUser }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [swipedUsers, setSwipedUsers] = useState(new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingUserData, setAnimatingUserData] = useState(null);
  const animationTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const { showNotification } = useToast();

  // Filter out swiped users in real-time
  const availableUsers = users.filter(user => !swipedUsers.has(user.id));

  // Load swiped users from localStorage on component mount
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const savedSwipedUsers = localStorage.getItem(`clutched_swiped_${currentUser.id}`);
    if (savedSwipedUsers) {
      try {
        const swipedSet = new Set(JSON.parse(savedSwipedUsers));
        setSwipedUsers(swipedSet);
        console.log('Loaded swiped users:', swipedSet);
      } catch (error) {
        console.error('Error loading swiped users:', error);
      }
    }
  }, [currentUser?.id]);

  // Global message sync for real-time updates
  useEffect(() => {
    if (!currentUser?.id) return;

    console.log('=== HOMESCREEN: SETTING UP GLOBAL MESSAGE SYNC ===');
    console.log('Setting up global sync for user:', currentUser.id);

    const handleNewMessage = (messageData) => {
      console.log('=== HOMESCREEN: NEW MESSAGE DETECTED ===');
      console.log('New message data:', messageData);
      console.log('Chat ID:', messageData.chatId);
      console.log('Sender ID:', messageData.senderId);
      console.log('Content:', messageData.content);
      
      // Show toast notification for new message (with chat ID to prevent duplicates)
      const senderName = messageData.senderName || 'Someone';
      globalNotificationManager.showNotification(`${senderName}: ${messageData.content}`, messageData.chatId, messageData.id);
    };

    const handleChatUpdate = (chatId, latestMessage) => {
      console.log('=== HOMESCREEN: CHAT UPDATE DETECTED ===');
      console.log('Chat ID:', chatId);
      console.log('Latest message:', latestMessage);
      
      // No need to refresh anything on home screen
      // Just log for debugging
    };

    // Use centralized message sync manager
    startMessageSync(currentUser.id, handleNewMessage, handleChatUpdate);

    return () => {
      console.log('HOMESCREEN: Cleaning up message sync');
      stopMessageSync();
    };
  }, [currentUser?.id]);

  // Set user as online when component mounts
  useEffect(() => {
    if (currentUser?.id) {
      setUserOnline(currentUser.id);
    }
    
    // Set user as offline when component unmounts
    return () => {
      if (currentUser?.id) {
        setUserOffline(currentUser.id);
      }
    };
  }, [currentUser?.id]);

  // Load users from Firebase (optimized - no real-time listener)
  useEffect(() => {
    if (!currentUser?.id) return;

    const loadUsers = async () => {
      try {
        const users = await getUsersWithActiveStatus(currentUser.id, (discoveredUsers) => {
          console.log('Loaded users:', discoveredUsers.length);
          setUsers(discoveredUsers);
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Error loading users:', error);
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [currentUser?.id]);

  // Reset index if it's out of bounds
  useEffect(() => {
    if (availableUsers.length > 0 && currentIndex >= availableUsers.length) {
      setCurrentIndex(0);
    }
  }, [availableUsers.length, currentIndex]);

  // Handle index adjustment when available users array changes
  useEffect(() => {
    if (availableUsers.length > 0 && currentIndex >= availableUsers.length) {
      console.log('Index out of bounds, resetting to 0');
      setCurrentIndex(0);
    }
  }, [availableUsers, currentIndex]);

  // Cleanup animation timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const currentUserData = isAnimating ? animatingUserData : availableUsers[currentIndex];
  
  // Debug logging
  console.log('HomeScreen Debug:', {
    isAnimating,
    currentIndex,
    usersLength: users.length,
    availableUsersLength: availableUsers.length,
    currentUserData: currentUserData ? currentUserData.name || currentUserData.username : 'undefined'
  });

  // Guard clause to prevent rendering when no user data
  if (!currentUserData && availableUsers.length > 0) {
    return (
      <div className="h-screen bg-valorant-dark flex items-center justify-center animate-fade-in lg:max-w-md lg:mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-valorant-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading user data...</p>
        </div>
      </div>
    );
  }

  const handleLike = async () => {
    if (!currentUserData || isAnimating) return;
    
    console.log('Starting like animation for:', currentUserData.name);
    
    // Store the current user data for animation
    setAnimatingUserData(currentUserData);
    // Start fade out animation
    setIsAnimating(true);
    
    try {
      // Create match in Firebase
      await createMatchService(currentUser.id, currentUserData.id);
      console.log('Match created with:', currentUserData.name);
    } catch (error) {
      console.error('Error creating match:', error);
    }
    
    // Add to swiped users
    const newSwipedUsers = new Set([...swipedUsers, currentUserData.id]);
    setSwipedUsers(newSwipedUsers);
    
    // Save to localStorage
    localStorage.setItem(`clutched_swiped_${currentUser.id}`, JSON.stringify([...newSwipedUsers]));
    console.log('Added to swiped users:', currentUserData.id);
    
    // Clear any existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    // Set timeout for animation completion
    animationTimeoutRef.current = setTimeout(() => {
      console.log('Animation completing for:', currentUserData.name);
      setCurrentIndex(prev => (prev + 1) % availableUsers.length);
      setIsAnimating(false);
      setAnimatingUserData(null);
      animationTimeoutRef.current = null;
    }, 300);
  };

  const handlePass = () => {
    if (!currentUserData || isAnimating) return;
    
    console.log('Starting pass animation for:', currentUserData.name);
    
    // Store the current user data for animation
    setAnimatingUserData(currentUserData);
    // Start fade out animation
    setIsAnimating(true);
    
    // Add to swiped users
    const newSwipedUsers = new Set([...swipedUsers, currentUserData.id]);
    setSwipedUsers(newSwipedUsers);
    
    // Save to localStorage
    localStorage.setItem(`clutched_swiped_${currentUser.id}`, JSON.stringify([...newSwipedUsers]));
    console.log('Added to swiped users:', currentUserData.id);
    
    // Clear any existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    // Set timeout for animation completion
    animationTimeoutRef.current = setTimeout(() => {
      console.log('Animation completing for:', currentUserData.name);
      setCurrentIndex(prev => (prev + 1) % availableUsers.length);
      setIsAnimating(false);
      setAnimatingUserData(null);
      animationTimeoutRef.current = null;
    }, 300);
  };

  const handleChat = async () => {
    if (!currentUserData || isAnimating) return;
    
    // Store the current user data for animation
    setAnimatingUserData(currentUserData);
    // Start fade out animation
    setIsAnimating(true);
    
    try {
      // Create match first, then navigate to chat
      await createMatchService(currentUser.id, currentUserData.id);
      console.log('Match created with:', currentUserData.username || currentUserData.name);
      
      // Set up direct chat sync for the new chat
      const userIds = [currentUser.id, currentUserData.id].sort();
      const directChatId = `direct_${userIds[0]}_${userIds[1]}`;
      console.log('Setting up direct chat sync for new chat:', directChatId);
      
      const handleNewMessage = (messageData) => {
        console.log('=== HOMESCREEN DIRECT CHAT SYNC: NEW MESSAGE DETECTED ===');
        console.log('New message data:', messageData);
        
        // Show toast notification for new message (with chat ID to prevent duplicates)
        const senderName = messageData.senderName || 'Someone';
        showNotification(`${senderName}: ${messageData.content}`, messageData.chatId, messageData.id);
      };

      const handleChatUpdate = (chatId, latestMessage) => {
        console.log('=== HOMESCREEN DIRECT CHAT SYNC: CHAT UPDATE DETECTED ===');
        console.log('Chat ID:', chatId);
        console.log('Latest message:', latestMessage);
      };

      // Set up direct chat sync for notifications
      const unsubscribe = setupDirectChatSync(
        currentUser.id,
        directChatId,
        handleNewMessage,
        handleChatUpdate
      );
      
      // Store the unsubscribe function for cleanup
      // Note: This will be cleaned up when the component unmounts
      
    } catch (error) {
      console.error('Error creating match:', error);
    }
    
    // Add to swiped users (since they're going to chat, they've been "liked")
    const newSwipedUsers = new Set([...swipedUsers, currentUserData.id]);
    setSwipedUsers(newSwipedUsers);
    
    // Save to localStorage
    localStorage.setItem(`clutched_swiped_${currentUser.id}`, JSON.stringify([...newSwipedUsers]));
    console.log('Added to swiped users:', currentUserData.id);
    
    // Wait for animation to complete, then navigate
    setTimeout(() => {
      console.log('Navigating to chat with user:', currentUserData);
      // Reset animation state before navigating
      setIsAnimating(false);
      setAnimatingUserData(null);
      navigate('/chat', { state: { targetUser: currentUserData } });
    }, 300); // 300ms animation duration
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  // Function to clear swiped users (for testing)
  const clearSwipedUsers = () => {
    setSwipedUsers(new Set());
    localStorage.removeItem(`clutched_swiped_${currentUser.id}`);
    console.log('Cleared all swiped users');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-valorant-dark flex items-center justify-center animate-fade-in lg:max-w-md lg:mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-valorant-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Finding players...</p>
        </div>
      </div>
    );
  }

  // Show no users message
  if (availableUsers.length === 0) {
    return (
      <div className="h-screen bg-valorant-dark flex items-center justify-center animate-fade-in lg:max-w-md lg:mx-auto">
        <div className="text-center px-6">
          <div className="text-6xl mb-4">🎮</div>
          <h2 className="text-2xl font-bold text-white mb-2">No more players</h2>
          <p className="text-gray-400 mb-4">You've seen everyone! Check back later for new players.</p>
          <button
            onClick={clearSwipedUsers}
            className="bg-valorant-red hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Reset Swipes (Testing)
          </button>
        </div>
      </div>
    );
  }

  // Don't render if no current user data
  if (!currentUserData) {
    return (
      <div className="h-screen bg-valorant-dark flex items-center justify-center animate-fade-in lg:max-w-md lg:mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-valorant-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-valorant-dark flex flex-col overflow-hidden animate-fade-in lg:max-w-md lg:mx-auto" style={{ height: '100vh', height: '100dvh' }}>
      {/* Header - Centered Logo */}
      <div className="flex items-center justify-between p-3 pt-6 pb-3 sm:p-4 sm:pt-8 sm:pb-4">
        <div className="w-6 sm:w-8"></div>
        <div className="flex-1 flex justify-center">
          <img 
            src="/images/header.png" 
            alt="Clutched" 
            className="h-6 w-auto sm:h-8"
          />
        </div>
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className="text-white hover:text-valorant-red transition-colors text-lg sm:text-xl w-6 sm:w-8 flex justify-center"
        >
          ☰
        </button>
      </div>

      {/* Hamburger Menu */}
      {showMenu && (
        <div className="absolute top-16 right-3 z-50 bg-valorant-dark border border-valorant-red rounded-lg shadow-2xl min-w-40 sm:top-20 sm:right-4 sm:min-w-48 lg:top-16 lg:right-8">
          <div className="p-3 sm:p-4">
            <button
              onClick={() => {
                setShowMenu(false);
                setTimeout(() => handleNavigation('/home'), 150);
              }}
              className="w-full text-left text-white hover:text-valorant-red transition-colors py-2 flex items-center text-sm sm:text-base"
            >
              🏠 Home
            </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  setTimeout(() => handleNavigation('/chat'), 150);
                }}
                className="w-full text-left text-white hover:text-valorant-red transition-colors py-2 flex items-center text-sm sm:text-base"
              >
                💬 Chat
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  setTimeout(() => handleNavigation('/global-chat'), 150);
                }}
                className="w-full text-left text-white hover:text-valorant-red transition-colors py-2 flex items-center text-sm sm:text-base"
              >
                🌍 Global Chat
              </button>
            <button
              onClick={() => {
                setShowMenu(false);
                setTimeout(() => handleNavigation('/profile'), 150);
              }}
              className="w-full text-left text-white hover:text-valorant-red transition-colors py-2 flex items-center text-sm sm:text-base"
            >
              👤 Profile
            </button>
            {/* Admin Panel Link - Only show for admin/developer users */}
            {(currentUser?.isDeveloper || currentUser?.username === 'Alexus Karl' || currentUser?.id === 'dev_1761178419119') && (
              <button
                onClick={() => {
                  setShowMenu(false);
                  setTimeout(() => handleNavigation('/auth/admin'), 150);
                }}
                className="w-full text-left text-white hover:text-valorant-red transition-colors py-2 flex items-center text-sm sm:text-base"
              >
                ⚙️ Admin Panel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMenu(false)}
        ></div>
      )}

      {/* Agent Card - Full Screen with Overlay */}
      <div className="px-2 sm:px-4 flex-1 flex flex-col min-h-0">
        <div className="relative flex-1">
          <div className={`rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-valorant-red h-[92%] sm:h-[95%] mx-auto w-[96%] sm:w-[95%] transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
            <div className="relative h-full">
              <img
                src={currentUserData.agentImage}
                alt={currentUserData.favoriteAgent}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = '/images/default.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              
              {/* User Info Overlay - Responsive Position */}
              <div className="absolute bottom-16 sm:bottom-20 left-0 right-0 p-3 sm:p-6">
                <div className="flex items-end justify-between">
                  <div className="flex-1">
                    {/* Role Badge - Positioned above name, left aligned */}
                    {getUserRoleBadge(currentUserData) && (
                      <div className="mb-3 flex justify-start">
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase border ${getUserRoleBadge(currentUserData).bgColor} ${getUserRoleBadge(currentUserData).color} ${getUserRoleBadge(currentUserData).borderColor}`}>
                          {getUserRoleBadge(currentUserData).text}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center mb-1 sm:mb-2">
                      <h2 className="text-xl sm:text-3xl font-bold text-white mr-2 sm:mr-3 truncate">{currentUserData.username || currentUserData.name} {currentUserData.age}</h2>
                      <span className="text-lg sm:text-2xl flex-shrink-0">
                        {currentUserData.gender === 'Male' ? (
                          <span className="text-blue-400">♂</span>
                        ) : (
                          <span className="text-pink-400">♀</span>
                        )}
                      </span>
                    </div>
                    <p className="text-white text-sm sm:text-lg mb-1 truncate">{currentUserData.location}</p>
                    {currentUserData.bio && (
                      <p className="text-gray-300 text-xs sm:text-sm mb-1 sm:mb-2 italic line-clamp-2">"{currentUserData.bio}"</p>
                    )}
                    <div className="flex items-center space-x-2">
                      <span className="bg-valorant-red text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg text-xs sm:text-sm font-bold">
                        {currentUserData.rank}
                      </span>
                      {currentUserData.isCurrentlyActive && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-green-400 text-xs font-semibold">Online</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Overlay - Responsive Bottom */}
              <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-xs sm:max-w-none">
                <div className="flex justify-center space-x-4 sm:space-x-8 px-4">
                  <button
                    onClick={handlePass}
                    disabled={isAnimating}
                    className={`w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center transition-all duration-300 ${isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'} flex-shrink-0`}
                  >
                    <img 
                      src="/images/x-button.png" 
                      alt="Pass" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <span className="text-red-500 text-2xl sm:text-3xl font-bold hidden">✕</span>
                  </button>
                  <div className="w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center flex-shrink-0">
                    <img 
                      src="/images/valomiddle.png" 
                      alt="Valorant Logo" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <span className="text-white text-xl sm:text-2xl font-bold hidden">V</span>
                  </div>
                  <button
                    onClick={handleChat}
                    disabled={isAnimating}
                    className={`w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center transition-all duration-300 ${isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'} flex-shrink-0`}
                  >
                    <img 
                      src="/images/message-button.png" 
                      alt="Message" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <span className="text-gray-300 text-2xl sm:text-3xl hidden">💬</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
