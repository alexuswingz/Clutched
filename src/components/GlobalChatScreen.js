import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendGlobalMessage, getGlobalChatMessages } from '../firebase/services/globalChatService';
import { toggleMessageReaction, getMessageReactions, getUserReaction, REACTION_OPTIONS } from '../firebase/services/reactionService';
import { useToast } from '../contexts/ToastContext';
import { getUserAvatar, isDeveloperAccount, processUserAvatar, getUserRoleBadge } from '../utils/avatarUtils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const GlobalChatScreen = ({ currentUser }) => {
  const navigate = useNavigate();
  const { showNotification } = useToast();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messageReactions, setMessageReactions] = useState({});
  const [userReactions, setUserReactions] = useState({});
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [freshUserData, setFreshUserData] = useState(null);
  const [userRoles, setUserRoles] = useState({}); // Cache for user roles
  const messagesEndRef = useRef(null);
  
  // Fetch fresh user data to get updated custom images
  const fetchFreshUserData = async () => {
    if (!currentUser?.id) return;
    
    try {
      const userRef = doc(db, 'users', currentUser.id);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFreshUserData(userData);
        console.log('GlobalChatScreen: Fresh user data loaded:', userData);
      }
    } catch (error) {
      console.error('Error fetching fresh user data:', error);
    }
  };
  
  // Fetch fresh data on component mount
  useEffect(() => {
    fetchFreshUserData();
  }, [currentUser?.id]);
  
  // Refresh data when component becomes visible (user navigates back to global chat)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchFreshUserData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  
  // Use fresh user data if available, otherwise fall back to currentUser
  const userData = freshUserData || currentUser;
  
  // Process user data to ensure correct avatar handling
  const processedUser = processUserAvatar(userData);
  
  // Fetch user role for a specific user ID
  const fetchUserRole = async (userId) => {
    if (userRoles[userId]) {
      return userRoles[userId]; // Return cached role
    }
    
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role || (userData.isDeveloper ? 'developer' : null);
        
        // Cache the role
        setUserRoles(prev => ({
          ...prev,
          [userId]: role
        }));
        
        return role;
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
    
    return null;
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load global chat messages
  useEffect(() => {
    if (!processedUser?.id) return;

    console.log('Setting up global chat for user:', processedUser.id);
    
    const unsubscribe = getGlobalChatMessages((messagesData) => {
      console.log('Received global chat messages:', messagesData.length);
      // Debug: Log avatar data for messages
      messagesData.forEach((message, index) => {
        if (index < 3) { // Log first 3 messages for debugging
          console.log(`Message ${index + 1} - Sender: ${message.senderName}, Avatar: ${message.senderAvatar?.substring(0, 50)}..., Role: ${message.senderRole}`);
        }
      });
      setMessages(messagesData);
      setIsLoading(false);
    });

    return () => {
      console.log('Cleaning up global chat');
      unsubscribe();
    };
  }, [processedUser?.id]);

  // Load reactions for messages
  useEffect(() => {
    if (!processedUser?.id || messages.length === 0) return;

    const reactionUnsubscribes = messages.map(message => {
      return getMessageReactions(message.id, (reactionData) => {
        setMessageReactions(prev => ({
          ...prev,
          [message.id]: reactionData.reactions
        }));
      });
    });

    // Load user reactions for each message
    const loadUserReactions = async () => {
      const userReactionPromises = messages.map(async (message) => {
        const userReaction = await getUserReaction(message.id, processedUser.id);
        return { messageId: message.id, reaction: userReaction };
      });
      
      const userReactions = await Promise.all(userReactionPromises);
      const userReactionMap = {};
      userReactions.forEach(({ messageId, reaction }) => {
        userReactionMap[messageId] = reaction;
      });
      setUserReactions(userReactionMap);
    };

    loadUserReactions();

    return () => {
      reactionUnsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [processedUser?.id, messages]);

  // Fetch roles for all unique users in messages
  useEffect(() => {
    if (messages.length === 0) return;
    
    const uniqueUserIds = [...new Set(messages.map(msg => msg.senderId))];
    
    uniqueUserIds.forEach(userId => {
      if (!userRoles[userId]) {
        fetchUserRole(userId);
      }
    });
  }, [messages, userRoles]);

  // Send message to global chat
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    
    try {
      console.log('Sending global message with user data:', {
        id: processedUser.id,
        username: processedUser.username || processedUser.name,
        role: processedUser.role,
        avatar: getUserAvatar(processedUser)?.substring(0, 50) + '...'
      });
      
      const result = await sendGlobalMessage(
        processedUser.id,
        processedUser.username || processedUser.name,
        newMessage.trim(),
        getUserAvatar(processedUser),
        processedUser.age,
        processedUser.gender,
        processedUser.role
      );

      if (result.success) {
        setNewMessage('');
        console.log('Global message sent successfully');
      } else {
        showNotification('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending global message:', error);
      showNotification('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle long press to show reaction picker
  const handleLongPress = (messageId, event) => {
    event.preventDefault();
    setShowReactionPicker(messageId);
  };

  // Handle touch start for long press
  const handleTouchStart = (messageId) => {
    const timer = setTimeout(() => {
      setShowReactionPicker(messageId);
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  };

  // Handle touch end to cancel long press
  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Handle reaction selection
  const handleReactionSelect = async (messageId, reaction) => {
    try {
      const result = await toggleMessageReaction(messageId, processedUser.id, reaction);
      if (result.success) {
        setShowReactionPicker(null);
        // Update local state immediately for better UX
        setUserReactions(prev => ({
          ...prev,
          [messageId]: prev[messageId] === reaction ? null : reaction
        }));
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Close reaction picker
  const closeReactionPicker = () => {
    setShowReactionPicker(null);
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col overflow-hidden">

      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-black border-b border-gray-800 z-20">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-white hover:text-valorant-red transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-valorant-red rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">🌍</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Global Chat</h1>
                <p className="text-sm text-gray-400">
                  Community • {messages.length} messages
                </p>
              </div>
            </div>
          </div>
          
          {/* Menu Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-white hover:text-valorant-red transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Menu Dropdown */}
      {showMenu && (
        <div className="fixed top-16 right-4 bg-black border border-gray-800 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <button
              onClick={() => {
                setShowMenu(false);
                navigate('/profile');
              }}
              className="w-full text-left px-4 py-2 text-white hover:bg-gray-900 rounded transition-colors"
            >
              Profile
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                navigate('/home');
              }}
              className="w-full text-left px-4 py-2 text-white hover:bg-gray-900 rounded transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                navigate('/chat');
              }}
              className="w-full text-left px-4 py-2 text-white hover:bg-gray-900 rounded transition-colors"
            >
              Inbox
            </button>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 px-4 pt-20 pb-20 space-y-4 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-valorant-red border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌍</div>
            <h3 className="text-xl font-bold text-white mb-2">Welcome to Global Chat!</h3>
            <p className="text-gray-400">Be the first to start the conversation</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === processedUser.id ? 'justify-end' : 'justify-start'} relative`}
            >
              <div className="max-w-xs lg:max-w-md">
                {message.senderId !== processedUser.id && (
                  <div className="flex items-center space-x-2 mb-1">
                    <img
                      src={message.senderAvatar || '/images/default.jpg'}
                      alt={message.senderName || 'User'}
                      className="w-6 h-6 rounded-full object-cover"
                      onError={(e) => {
                        e.target.src = '/images/default.jpg';
                        e.target.className = 'w-6 h-6 rounded-full object-cover';
                      }}
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-300 font-semibold">
                        {message.senderName || 'Anonymous'}
                      </span>
                      {/* Role Badge */}
                      {(() => {
                        const messageRole = message.senderRole || userRoles[message.senderId];
                        console.log('Message role data:', message.senderName, 'Stored Role:', message.senderRole, 'Cached Role:', userRoles[message.senderId], 'Final Role:', messageRole);
                        return messageRole;
                      })() && (
                        <span className={`text-xs px-2 py-1 rounded-lg border font-bold tracking-wider uppercase ${
                          (message.senderRole || userRoles[message.senderId]) === 'developer' 
                            ? 'text-red-300 bg-red-900/20 border-red-500/30'
                            : (message.senderRole || userRoles[message.senderId]) === 'moderator'
                            ? 'text-blue-300 bg-blue-900/20 border-blue-500/30'
                            : (message.senderRole || userRoles[message.senderId]) === 'tester'
                            ? 'text-green-300 bg-green-900/20 border-green-500/30'
                            : 'text-gray-300 bg-gray-900/20 border-gray-500/30'
                        }`}>
                          {(message.senderRole || userRoles[message.senderId]) === 'developer' ? 'DEV' : 
                           (message.senderRole || userRoles[message.senderId]) === 'moderator' ? 'MOD' : 
                           (message.senderRole || userRoles[message.senderId]) === 'tester' ? 'TEST' : 
                           (message.senderRole || userRoles[message.senderId])?.toUpperCase()}
                        </span>
                      )}
                      {message.senderAge && (
                        <span className="text-xs text-gray-400">
                          {message.senderAge}
                        </span>
                      )}
                      {message.senderGender && (
                        <span className={`text-xs px-2 py-1 rounded-full border ${
                          message.senderGender === 'Male' 
                            ? 'text-blue-400 bg-blue-900/30 border-blue-500/30' 
                            : message.senderGender === 'Female' 
                            ? 'text-pink-400 bg-pink-900/30 border-pink-500/30'
                            : 'text-gray-400 bg-gray-800/30 border-gray-500/30'
                        }`}>
                          {message.senderGender === 'Male' ? '♂' : message.senderGender === 'Female' ? '♀' : message.senderGender}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    message.senderId === processedUser.id
                      ? 'bg-valorant-red text-white'
                      : 'bg-gray-700 text-white'
                  } relative`}
                  style={message.senderId !== processedUser.id ? { marginLeft: '32px' } : {}}
                  onContextMenu={(e) => handleLongPress(message.id, e)}
                  onTouchStart={() => handleTouchStart(message.id)}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={() => handleTouchStart(message.id)}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                >
                  <p className="text-sm break-words">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {formatTime(message.timestamp)}
                  </p>
                  
                  {/* Reactions Display */}
                  {messageReactions[message.id] && Object.keys(messageReactions[message.id]).some(key => messageReactions[message.id][key] > 0) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(messageReactions[message.id]).map(([reaction, count]) => {
                        if (count > 0) {
                          const reactionOption = REACTION_OPTIONS.find(opt => opt.key === reaction);
                          return (
                            <span
                              key={reaction}
                              className={`text-xs px-2 py-1 rounded-full ${
                                userReactions[message.id] === reaction 
                                  ? 'bg-valorant-red/20 border border-valorant-red/50' 
                                  : 'bg-gray-600/50'
                              }`}
                            >
                              {reactionOption?.emoji} {count}
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 p-3 z-30">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message to the community..."
            className="flex-1 bg-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-lg border border-gray-600 focus:border-valorant-red focus:outline-none transition-colors"
            disabled={isSending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              newMessage.trim() && !isSending
                ? 'bg-valorant-red hover:bg-red-600 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>

      {/* Reaction Picker */}
      {showReactionPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={closeReactionPicker}
          ></div>
          <div className="relative bg-gray-800 rounded-2xl p-4 shadow-2xl">
            <div className="flex space-x-4">
              {REACTION_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleReactionSelect(showReactionPicker, option.key)}
                  className="w-12 h-12 flex items-center justify-center text-2xl hover:scale-125 transition-transform bg-gray-700 rounded-full hover:bg-gray-600"
                  title={option.label}
                >
                  {option.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalChatScreen;
