import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserMatches } from '../firebase/services/matchService';
import { getChatMessages, sendMessage, markMessagesAsRead } from '../firebase/services/messageService';
import { startMessageSync, stopMessageSync, addChatListener } from '../firebase/services/messageSyncManager';
import { getUserProfile } from '../firebase/services/userService';
import { toggleMessageReaction, getMessageReactions, getUserReaction, REACTION_OPTIONS } from '../firebase/services/reactionService';
import { useToast } from '../contexts/ToastContext';
import { collection, query, orderBy, limit, getDocs, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

const ChatScreen = ({ currentUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification, setActiveChatId, clearNotifiedMessages } = useToast();
  const [activeChat, setActiveChat] = useState(null);
  const [message, setMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [directChatUser, setDirectChatUser] = useState(null);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [chatUserInfo, setChatUserInfo] = useState(null);
  const [messageReactions, setMessageReactions] = useState({});
  const [userReactions, setUserReactions] = useState({});
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);

    // Check for direct chat user from navigation
    useEffect(() => {
      if (chatInitialized) return;
      
      console.log('ChatScreen: Checking location.state:', location.state);
      if (location.state?.targetUser) {
        console.log('ChatScreen: Direct chat user found:', location.state.targetUser);
        setDirectChatUser(location.state.targetUser);
        // Create a consistent chat ID that both users will use
        const userIds = [currentUser.id, location.state.targetUser.id].sort();
        const directChatId = `direct_${userIds[0]}_${userIds[1]}`;
        console.log('ChatScreen: Creating direct chat with ID:', directChatId);
        setActiveChat(directChatId);
        setSelectedChat({
          id: directChatId,
          name: location.state.targetUser.username || location.state.targetUser.name,
          favoriteAgent: location.state.targetUser.favoriteAgent,
          agentAvatar: location.state.targetUser.agentImage,
          lastMessage: "Start a conversation!",
          timestamp: new Date(),
          displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          online: true,
          otherUserId: location.state.targetUser.id
        });
        setIsLoading(false);
        setChatInitialized(true);
        console.log('ChatScreen: Chat initialized successfully');
      } else {
        console.log('ChatScreen: No direct chat user, loading matches...');
        // Set a timeout to prevent infinite loading
        const timeout = setTimeout(() => {
          console.log('ChatScreen: Timeout reached, stopping loading');
          setIsLoading(false);
          setChatInitialized(true);
        }, 3000);
        
        return () => clearTimeout(timeout);
      }
    }, [location.state, currentUser?.id, chatInitialized]);

  // Get all users for chat list (not just matches)
  useEffect(() => {
    if (!currentUser?.id) return;

    console.log('Loading all users for chat list...');
    
    // Get all users except current user
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('id', '!=', currentUser.id));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Found users for chat list:', allUsers.length);
      
      // Create chat entries only for users who have messages
      const chatsWithDetails = await Promise.all(
        allUsers.map(async (user) => {
          // Use the same chat ID format as direct chats
          const userIds = [currentUser.id, user.id].sort();
          const chatId = `direct_${userIds[0]}_${userIds[1]}`;
          
          // Get the latest message for this chat
          let lastMessage = "Start a conversation!";
          let lastTimestamp = new Date();
          let unreadCount = 0;
          let hasMessages = false;
          
          try {
            // Get messages for this chat to find the latest one
            const messagesRef = collection(db, 'messages', chatId, 'chats');
            const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
              hasMessages = true;
              const latestMessage = snapshot.docs[0].data();
              lastMessage = latestMessage.content;
              lastTimestamp = latestMessage.timestamp.toDate();
              
              // Count unread messages (messages not from current user)
              // Get all messages and filter in JavaScript to avoid composite index requirement
              const allMessagesQuery = query(messagesRef, orderBy('timestamp', 'desc'));
              const allMessagesSnapshot = await getDocs(allMessagesQuery);
              
              // Filter unread messages from other users in JavaScript
              unreadCount = allMessagesSnapshot.docs.filter(doc => {
                const data = doc.data();
                return data.senderId !== currentUser.id && data.read === false;
              }).length;
            }
          } catch (error) {
            console.error('Error getting latest message for chat:', chatId, error);
          }
          
          // Only return chat if there are messages
          if (hasMessages) {
            return {
              id: chatId, // Use consistent chat ID format
              name: user.username || user.name,
              favoriteAgent: user.favoriteAgent,
              agentAvatar: `/images/${user.favoriteAgent?.toLowerCase() || 'jett'}.jpg`,
              lastMessage: lastMessage,
              timestamp: lastTimestamp, // Keep as Date object for sorting
              displayTime: lastTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // String for display
              unread: unreadCount,
              online: true,
              otherUserId: user.id
            };
          }
          
          return null; // Don't show users without messages
        })
      );
      
      const filteredChats = chatsWithDetails.filter(chat => chat !== null);
      
      // Sort by timestamp (most recent first)
      filteredChats.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        console.log(`Initial load sorting: ${a.name} (${a.timestamp} -> ${dateA}) vs ${b.name} (${b.timestamp} -> ${dateB})`);
        return dateB - dateA;
      });
      
      setChats(filteredChats);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  // Real-time updates for chat list messages
  useEffect(() => {
    if (!currentUser?.id || directChatUser || chats.length === 0) return;

    console.log('Setting up real-time chat list updates for', chats.length, 'chats');
    
    // Set up listeners for each chat to update last message and unread count
    const unsubscribes = chats.map(chat => {
      const messagesRef = collection(db, 'messages', chat.id, 'chats');
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
      
      return onSnapshot(q, async (snapshot) => {
        if (!snapshot.empty) {
          const latestMessage = snapshot.docs[0].data();
          
          // Recalculate unread count for this chat
          let unreadCount = 0;
          try {
            // Get all messages and filter in JavaScript to avoid composite index requirement
            const allMessagesQuery = query(messagesRef, orderBy('timestamp', 'desc'));
            const allMessagesSnapshot = await getDocs(allMessagesQuery);
            
            // Filter unread messages from other users in JavaScript
            unreadCount = allMessagesSnapshot.docs.filter(doc => {
              const data = doc.data();
              return data.senderId !== currentUser.id && data.read === false;
            }).length;
            
            console.log('Calculated unread count:', unreadCount, 'for chat:', chat.id);
          } catch (error) {
            console.error('Error recalculating unread count for chat:', chat.id, error);
            // Fallback: set unread count to 0 to prevent crashes
            unreadCount = 0;
          }
          
          // Update the chat in the list
          setChats(prevChats => 
            prevChats.map(c => 
              c.id === chat.id 
                ? {
                    ...c,
                    lastMessage: latestMessage.content,
                    timestamp: latestMessage.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    unread: unreadCount
                  }
                : c
            )
          );
        }
      });
    });

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [currentUser?.id, directChatUser, chats.length]);

  // Fetch user info when we have activeChat but no selectedChat
  useEffect(() => {
    if (activeChat && !selectedChat && !directChatUser) {
      console.log('Fetching user info for activeChat:', activeChat);
      
      const fetchUserInfo = async () => {
        try {
          // Extract user ID from chat ID
          if (activeChat.startsWith('direct_')) {
            const parts = activeChat.replace('direct_', '').split('_');
            if (parts.length === 2) {
              const otherUserId = parts.find(id => id !== currentUser.id);
              if (otherUserId) {
                console.log('Found other user ID:', otherUserId);
                
                // Get user info from Firebase
                const userDoc = await getDoc(doc(db, 'users', otherUserId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  setChatUserInfo({
                    id: otherUserId,
                    name: userData.username || userData.name,
                    favoriteAgent: userData.favoriteAgent,
                    agentImage: `/images/${userData.favoriteAgent?.toLowerCase() || 'jett'}.jpg`
                  });
                  console.log('Set chat user info:', userData);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error fetching user info:', error);
        }
      };
      
      fetchUserInfo();
    }
  }, [activeChat, selectedChat, directChatUser, currentUser?.id]);

  // Global message sync for real-time updates across all screens
  useEffect(() => {
    if (!currentUser?.id) return;

    console.log('=== SETTING UP GLOBAL MESSAGE SYNC ===');
    console.log('Setting up global sync for user:', currentUser.id);

    const handleNewMessage = (messageData) => {
      console.log('=== GLOBAL SYNC: NEW MESSAGE DETECTED ===');
      console.log('New message data:', messageData);
      console.log('Chat ID:', messageData.chatId);
      console.log('Sender ID:', messageData.senderId);
      console.log('Content:', messageData.content);
      
      // No notification in ChatScreen - user is already viewing messages
      console.log('ChatScreen: Skipping notification - user is in conversation view');
    };

    const handleChatUpdate = (chatId, latestMessage) => {
      console.log('=== GLOBAL SYNC: CHAT UPDATE DETECTED ===');
      console.log('Chat ID:', chatId);
      console.log('Latest message:', latestMessage);
      
      // Refresh the chat list to show new messages
      const refreshChatList = async () => {
        try {
          console.log('Refreshing chat list due to new message');
          
          // Get all users for chat list
          const usersRef = collection(db, 'users');
          const usersSnapshot = await getDocs(usersRef);
          const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Filter out current user
          const otherUsers = allUsers.filter(user => user.id !== currentUser.id);

          // Get all messages to find active conversations
          const messagesRef = collection(db, 'messages');
          const messagesSnapshot = await getDocs(messagesRef);
          const messageCollections = messagesSnapshot.docs.map(doc => doc.id);

          const chatPromises = otherUsers.map(async (user) => {
            const userChatId = `direct_${[currentUser.id, user.id].sort().join('_')}`;

            if (messageCollections.includes(userChatId)) {
              try {
                // Get the latest message for this chat
                const chatMessagesRef = collection(db, 'messages', userChatId, 'chats');
                const q = query(chatMessagesRef, orderBy('timestamp', 'desc'), limit(1));
                const latestMessageSnapshot = await getDocs(q);
                
                if (!latestMessageSnapshot.empty) {
                  const latestMessage = latestMessageSnapshot.docs[0].data();
                  
                  // Count unread messages from other users
                  // Get all messages and filter in JavaScript to avoid composite index requirement
                  const allMessagesQuery = query(chatMessagesRef, orderBy('timestamp', 'desc'));
                  const allMessagesSnapshot = await getDocs(allMessagesQuery);
                  
                  // Filter unread messages from other users in JavaScript
                  const unreadCount = allMessagesSnapshot.docs.filter(doc => {
                    const data = doc.data();
                    return data.senderId !== currentUser.id && data.read === false;
                  }).length;

                  return {
                    ...user,
                    chatId: userChatId,
                    lastMessage: latestMessage.content,
                    timestamp: latestMessage.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    unread: unreadCount
                  };
                }
              } catch (error) {
                console.error('Error refreshing chat for', user.name, ':', error);
              }
            }
            return null;
          });

          const chatResults = await Promise.all(chatPromises);
          const activeChats = chatResults.filter(chat => chat !== null);
          console.log('Refreshed active chats:', activeChats.length);
          setChats(activeChats);
        } catch (error) {
          console.error('Error refreshing chat list:', error);
        }
      };

      // Refresh chat list after a short delay
      setTimeout(refreshChatList, 500);
    };

    // Use centralized message sync manager
    startMessageSync(currentUser.id, handleNewMessage, handleChatUpdate);

    return () => {
      console.log('Cleaning up message sync');
      stopMessageSync();
    };
  }, [currentUser?.id]);

  // Refresh chat list when navigating back to inbox
  useEffect(() => {
    const refreshChatList = async () => {
      try {
        console.log('Refreshing chat list on navigation');
        
        // Get all users for chat list
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Get all matches for current user
        const matches = await getUserMatches(currentUser.id);
        const matchedUserIds = new Set(matches.map(match => match.userId));
        
        // Filter to only matched users
        const matchedUsers = allUsers.filter(user => 
          user.id !== currentUser.id && matchedUserIds.has(user.id)
        );
        
        // Create chat list with latest messages
        const chatList = await Promise.all(
          matchedUsers.map(async (user) => {
            const userIds = [currentUser.id, user.id].sort();
            const chatId = `direct_${userIds[0]}_${userIds[1]}`;
            
            try {
              // Get latest message for this chat
              const chatsRef = collection(db, 'messages', chatId, 'chats');
              const q = query(chatsRef, orderBy('timestamp', 'desc'), limit(1));
              const snapshot = await getDocs(q);
              
              let lastMessage = null;
              if (!snapshot.empty) {
                const latestDoc = snapshot.docs[0];
                lastMessage = {
                  id: latestDoc.id,
                  ...latestDoc.data()
                };
                console.log(`Latest message for ${user.name}:`, lastMessage);
                console.log(`Message timestamp:`, lastMessage.timestamp);
                console.log(`Converted timestamp:`, lastMessage.timestamp?.toDate ? lastMessage.timestamp.toDate() : lastMessage.timestamp);
              }
              
                const timestamp = lastMessage?.timestamp?.toDate ? lastMessage.timestamp.toDate() : (lastMessage?.timestamp || new Date('1970-01-01'));
                return {
                  id: chatId,
                  name: user.username || user.name || 'Unknown User',
                  favoriteAgent: user.favoriteAgent || 'Unknown',
                  agentAvatar: user.agentImage || user.avatar || '/images/default.jpg',
                  lastMessage: lastMessage?.content || 'No messages yet',
                  timestamp: timestamp, // Keep as Date object for sorting
                  displayTime: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // String for display
                  unreadCount: 0
                };
            } catch (error) {
              console.error('Error getting latest message for chat:', chatId, error);
                const timestamp = new Date('1970-01-01');
                return {
                  id: chatId,
                  name: user.username || user.name || 'Unknown User',
                  favoriteAgent: user.favoriteAgent || 'Unknown',
                  agentAvatar: user.agentImage || user.avatar || '/images/default.jpg',
                  lastMessage: 'No messages yet',
                  timestamp: timestamp, // Keep as Date object for sorting
                  displayTime: 'No messages', // String for display
                  unreadCount: 0
                };
            }
          })
        );
        
        // Sort by timestamp (most recent first)
        chatList.sort((a, b) => {
          const dateA = new Date(a.timestamp);
          const dateB = new Date(b.timestamp);
          console.log(`Sorting: ${a.name} (${a.timestamp} -> ${dateA}) vs ${b.name} (${b.timestamp} -> ${dateB})`);
          console.log(`Result: ${dateB - dateA}`);
          return dateB - dateA;
        });
        
        console.log('Updated chat list on navigation:', chatList);
        setChats(chatList);
      } catch (error) {
        console.error('Error refreshing chat list on navigation:', error);
      }
    };

    // Refresh when component mounts or when location changes
    refreshChatList();
  }, [location.pathname, currentUser?.id]);

  // Real-time messages for active chat
  useEffect(() => {
    if (!activeChat) {
      console.log('No activeChat set, skipping message setup');
      return;
    }

    console.log('Setting up real-time messages for chat:', activeChat);
    console.log('Current user ID:', currentUser?.id);
    
    try {
      const unsubscribe = getChatMessages(activeChat, (messagesData) => {
        console.log('=== MESSAGE LISTENER DEBUG ===');
        console.log('Received real-time messages:', messagesData);
        console.log('Messages count:', messagesData.length);
        console.log('Chat ID:', activeChat);
        console.log('Current user:', currentUser?.id);
        
        // Log each message for debugging
        messagesData.forEach((msg, index) => {
          console.log(`Message ${index + 1}:`, {
            id: msg.id,
            senderId: msg.senderId,
            content: msg.content,
            timestamp: msg.timestamp,
            read: msg.read
          });
        });
        
        setMessages(messagesData);
        
        // Auto-scroll to bottom when messages are loaded
        setTimeout(() => {
          scrollToBottom(false); // Instant scroll when loading messages
        }, 500);
      });

      // Mark messages as read when chat is opened
      const markAsRead = async () => {
        try {
          const result = await markMessagesAsRead(activeChat, currentUser.id);
          if (result.success) {
            console.log(`Marked ${result.updatedCount} messages as read`);
            
            // Force refresh chat list to update unread counts
            setTimeout(() => {
              console.log('Refreshing chat list after marking messages as read');
              // Trigger a re-fetch of chat list to update unread counts
              const refreshChatList = async () => {
                try {
                  // Get all users for chat list
                  const usersRef = collection(db, 'users');
                  const usersSnapshot = await getDocs(usersRef);
                  const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                  // Filter out current user
                  const otherUsers = allUsers.filter(user => user.id !== currentUser.id);

                  // Get all messages to find active conversations
                  const messagesRef = collection(db, 'messages');
                  const messagesSnapshot = await getDocs(messagesRef);
                  const messageCollections = messagesSnapshot.docs.map(doc => doc.id);

                  const chatPromises = otherUsers.map(async (user) => {
                    const userChatId = `direct_${[currentUser.id, user.id].sort().join('_')}`;

                    if (messageCollections.includes(userChatId)) {
                      try {
                        // Get the latest message for this chat
                        const chatMessagesRef = collection(db, 'messages', userChatId, 'chats');
                        const q = query(chatMessagesRef, orderBy('timestamp', 'desc'), limit(1));
                        const latestMessageSnapshot = await getDocs(q);
                        
                        if (!latestMessageSnapshot.empty) {
                          const latestMessage = latestMessageSnapshot.docs[0].data();
                          
                          // Count unread messages from other users
                          const allMessagesQuery = query(chatMessagesRef, orderBy('timestamp', 'desc'));
                          const allMessagesSnapshot = await getDocs(allMessagesQuery);
                          
                          const unreadCount = allMessagesSnapshot.docs.filter(doc => {
                            const data = doc.data();
                            return data.senderId !== currentUser.id && data.read === false;
                          }).length;

                          return {
                            ...user,
                            chatId: userChatId,
                            lastMessage: latestMessage.content,
                            timestamp: latestMessage.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            unread: unreadCount
                          };
                        }
                      } catch (error) {
                        console.error('Error refreshing chat for', user.name, ':', error);
                      }
                    }
                    return null;
                  });

                  const chatResults = await Promise.all(chatPromises);
                  const activeChats = chatResults.filter(chat => chat !== null);
                  console.log('Refreshed active chats after marking as read:', activeChats.length);
                  
                  // Only update chats if we found some, otherwise preserve existing chats
                  if (activeChats.length > 0) {
                    setChats(activeChats);
                    console.log('Updated chats array with', activeChats.length, 'chats');
                  } else {
                    console.log('No chats found in refresh, preserving existing chats to prevent empty list');
                    console.log('Current chats array length:', chats.length);
                    console.log('Available chats:', chats.map(c => c.id));
                    console.log('NOT updating chats array to prevent "No chats yet" issue');
                    // Don't update chats array if refresh returned empty
                    // This prevents "No chats yet" when going back
                  }
                  
                  // Preserve selectedChat if it exists and matches activeChat
                  if (selectedChat && activeChat && selectedChat.id === activeChat) {
                    console.log('Preserving selectedChat during refresh');
                    // Keep the existing selectedChat to prevent it from becoming undefined
                  }
                } catch (error) {
                  console.error('Error refreshing chat list after marking as read:', error);
                }
              };

              refreshChatList();
            }, 500);
          }
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      };
      
      // Mark as read after a short delay to ensure messages are loaded
      setTimeout(markAsRead, 1000);
      
      // Force refresh messages after a delay to ensure they're loaded
      const forceRefresh = () => {
        console.log('Force refreshing messages for chat:', activeChat);
        // Trigger a re-fetch by calling the message service again
        getChatMessages(activeChat, (messagesData) => {
          console.log('Force refresh received messages:', messagesData);
          setMessages(messagesData);
        });
      };
      
      // Force refresh after 2 seconds to catch any missed messages
      setTimeout(forceRefresh, 2000);

      return () => {
        console.log('Cleaning up message listener for chat:', activeChat);
        unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up message listener:', error);
      // Set empty messages array on error
      setMessages([]);
    }
  }, [activeChat, currentUser?.id]);

  // Set up direct chat sync for notifications when activeChat changes
  useEffect(() => {
    if (!activeChat || !currentUser?.id) return;

    console.log('Setting up direct chat sync for notifications:', activeChat);
    
    // Set the active chat ID in the context
    setActiveChatId(activeChat);
    
    // Clear notified messages for this chat since user is now viewing it
    clearNotifiedMessages(activeChat);
    
    const handleNewMessage = (messageData) => {
      console.log('=== DIRECT CHAT SYNC: NEW MESSAGE DETECTED ===');
      console.log('New message data:', messageData);
      
      // No notification in ChatScreen - user is already viewing messages
      console.log('ChatScreen: Skipping notification - user is in conversation view');
    };

    const handleChatUpdate = (chatId, latestMessage) => {
      console.log('=== DIRECT CHAT SYNC: CHAT UPDATE DETECTED ===');
      console.log('Chat ID:', chatId);
      console.log('Latest message:', latestMessage);
      
      // Refresh the chat list to show new messages
      const refreshChatList = async () => {
        try {
          console.log('Refreshing chat list due to new message in active chat');
          
          // Get all users for chat list
          const usersRef = collection(db, 'users');
          const usersSnapshot = await getDocs(usersRef);
          const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Get all matches for current user
          const matches = await getUserMatches(currentUser.id);
          const matchedUserIds = new Set(matches.map(match => match.userId));
          
          // Filter to only matched users
          const matchedUsers = allUsers.filter(user => 
            user.id !== currentUser.id && matchedUserIds.has(user.id)
          );
          
          // Create chat list with latest messages
          const chatList = await Promise.all(
            matchedUsers.map(async (user) => {
              const userIds = [currentUser.id, user.id].sort();
              const chatId = `direct_${userIds[0]}_${userIds[1]}`;
              
              try {
                // Get latest message for this chat
                const chatsRef = collection(db, 'messages', chatId, 'chats');
                const q = query(chatsRef, orderBy('timestamp', 'desc'), limit(1));
                const snapshot = await getDocs(q);
                
                let lastMessage = null;
                if (!snapshot.empty) {
                  const latestDoc = snapshot.docs[0];
                  lastMessage = {
                    id: latestDoc.id,
                    ...latestDoc.data()
                  };
                  console.log(`Latest message for ${user.name}:`, lastMessage);
                  console.log(`Message timestamp:`, lastMessage.timestamp);
                  console.log(`Converted timestamp:`, lastMessage.timestamp?.toDate ? lastMessage.timestamp.toDate() : lastMessage.timestamp);
                }
                
                const timestamp = lastMessage?.timestamp?.toDate ? lastMessage.timestamp.toDate() : (lastMessage?.timestamp || new Date('1970-01-01'));
                return {
                  id: chatId,
                  name: user.username || user.name || 'Unknown User',
                  favoriteAgent: user.favoriteAgent || 'Unknown',
                  agentAvatar: user.agentImage || user.avatar || '/images/default.jpg',
                  lastMessage: lastMessage?.content || 'No messages yet',
                  timestamp: timestamp, // Keep as Date object for sorting
                  displayTime: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // String for display
                  unreadCount: 0 // We'll calculate this separately if needed
                };
              } catch (error) {
                console.error('Error getting latest message for chat:', chatId, error);
                const timestamp = new Date('1970-01-01');
                return {
                  id: chatId,
                  name: user.username || user.name || 'Unknown User',
                  favoriteAgent: user.favoriteAgent || 'Unknown',
                  agentAvatar: user.agentImage || user.avatar || '/images/default.jpg',
                  lastMessage: 'No messages yet',
                  timestamp: timestamp, // Keep as Date object for sorting
                  displayTime: 'No messages', // String for display
                  unreadCount: 0
                };
              }
            })
          );
          
          // Sort by timestamp (most recent first)
          chatList.sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            console.log(`Sorting: ${a.name} (${a.timestamp} -> ${dateA}) vs ${b.name} (${b.timestamp} -> ${dateB})`);
            console.log(`Result: ${dateB - dateA}`);
            return dateB - dateA;
          });
          
          console.log('Updated chat list:', chatList);
          setChats(chatList);
        } catch (error) {
          console.error('Error refreshing chat list:', error);
        }
      };
      
      // Refresh chat list after a short delay
      setTimeout(refreshChatList, 500);
    };

    // Add specific chat listener for active chat
    if (activeChat) {
      addChatListener(activeChat);
    }

    return () => {
      console.log('Cleaning up direct chat sync for chat:', activeChat);
      // Clear the active chat ID when leaving
      setActiveChatId(null);
    };
  }, [activeChat, currentUser?.id, showNotification]);

  // Load reactions for messages
  useEffect(() => {
    if (!currentUser?.id || messages.length === 0) return;

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
        const userReaction = await getUserReaction(message.id, currentUser.id);
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
  }, [currentUser?.id, messages]);

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
      const result = await toggleMessageReaction(messageId, currentUser.id, reaction);
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

  // Auto-scroll to bottom function
  const scrollToBottom = (smooth = true, retries = 3) => {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      // Force a reflow to ensure DOM is updated
      messagesContainer.offsetHeight;
      
      const targetScrollTop = messagesContainer.scrollHeight;
      
      if (smooth) {
        messagesContainer.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      } else {
        messagesContainer.scrollTop = targetScrollTop;
      }
      
      console.log('Auto-scrolled to bottom, scrollHeight:', messagesContainer.scrollHeight, 'scrollTop:', messagesContainer.scrollTop, 'target:', targetScrollTop);
      
      // If scroll didn't work and we have retries left, try again
      if (messagesContainer.scrollTop < targetScrollTop - 10 && retries > 0) {
        console.log('Scroll not at bottom, retrying...', retries - 1, 'retries left');
        setTimeout(() => {
          scrollToBottom(smooth, retries - 1);
        }, 100);
      }
    } else {
      console.log('Messages container not found for auto-scroll');
    }
  };

  // Debug function to check scroll state
  const debugScrollState = () => {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      console.log('=== SCROLL DEBUG ===');
      console.log('ScrollHeight:', messagesContainer.scrollHeight);
      console.log('ScrollTop:', messagesContainer.scrollTop);
      console.log('ClientHeight:', messagesContainer.clientHeight);
      console.log('Is at bottom:', messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 10);
      console.log('Messages count:', messages.length);
      console.log('Active chat:', activeChat);
    }
  };

  // Expose debug function to window for testing
  if (typeof window !== 'undefined') {
    window.debugScrollState = debugScrollState;
    window.scrollToBottom = scrollToBottom;
  }

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Use a longer timeout to ensure DOM is fully updated
      setTimeout(() => {
        scrollToBottom(true);
      }, 200);
    }
  }, [messages]);

  // Force scroll to bottom when component first renders with messages
  useEffect(() => {
    if (messages.length > 0 && activeChat) {
      // Multiple attempts to ensure scroll works
      setTimeout(() => scrollToBottom(false), 100);
      setTimeout(() => scrollToBottom(false), 300);
      setTimeout(() => scrollToBottom(false), 600);
    }
  }, [activeChat, messages.length]);

  // Auto-scroll when opening a chat (activeChat changes)
  useEffect(() => {
    if (activeChat && messages.length > 0) {
      // Scroll to bottom when opening a chat
      setTimeout(() => {
        scrollToBottom(false); // Instant scroll when opening chat
      }, 300);
    }
  }, [activeChat]);

  // Auto-scroll when new messages arrive (real-time updates)
  useEffect(() => {
    if (messages.length > 0 && activeChat) {
      // Check if user is at or near the bottom of the chat
      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        const isNearBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 100;
        
        // Only auto-scroll if user is near the bottom (not scrolled up reading old messages)
        if (isNearBottom) {
          setTimeout(() => {
            scrollToBottom(true); // Smooth scroll for new messages
          }, 100);
        }
      }
    }
  }, [messages.length, activeChat]);

  // Auto-scroll chat list to top when navigating back to chat list
  useEffect(() => {
    if (!activeChat && chats.length > 0) {
      // Scroll chat list to top when returning to chat list
      setTimeout(() => {
        const chatListContainer = document.querySelector('.space-y-3');
        if (chatListContainer) {
          chatListContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [activeChat, chats.length]);

  // Auto-scroll to top when chat list first loads
  useEffect(() => {
    if (!activeChat && chats.length > 0 && !isLoading) {
      // Scroll to top when chat list first loads
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 200);
    }
  }, [chats.length, isLoading, activeChat]);

  // Update selected chat when activeChat changes
  useEffect(() => {
    if (activeChat) {
      const chat = chats.find(c => c.id === activeChat);
      if (chat) {
        setSelectedChat(chat);
        console.log('Found chat in chats array, setting selectedChat:', chat);
      } else {
        // Don't clear selectedChat if we can't find it in chats array
        // This prevents the "Unknown User" issue during chat list refreshes
        console.log('No chat found in chats array for activeChat:', activeChat, 'but preserving selectedChat');
        console.log('Current selectedChat:', selectedChat);
        console.log('Available chats:', chats.map(c => c.id));
        
        // If we have a selectedChat but it's not in the chats array, keep it
        if (selectedChat && selectedChat.id === activeChat) {
          console.log('Preserving existing selectedChat to prevent "Unknown User" issue');
          // Don't clear selectedChat - keep the existing one
        }
      }
    } else {
      setSelectedChat(null);
    }
  }, [activeChat, chats]);

    const handleSendMessage = async (e) => {
      e.preventDefault();
      console.log('=== MESSAGE SEND DEBUG ===');
      console.log('activeChat:', activeChat);
      console.log('directChatUser:', directChatUser);
      console.log('location.state:', location.state);
      console.log('selectedChat:', selectedChat);
      console.log('message:', message);
      
      let chatId = activeChat;
      let participants = [];
      
      // If no activeChat but we have directChatUser, create consistent chat ID
      if (!chatId && directChatUser) {
        const userIds = [currentUser.id, directChatUser.id].sort();
        chatId = `direct_${userIds[0]}_${userIds[1]}`;
        participants = [currentUser.id, directChatUser.id];
        console.log('Created chatId from directChatUser:', chatId);
      }
      
      // If no activeChat but we have location.state.targetUser, create consistent chat ID
      if (!chatId && location.state?.targetUser) {
        const userIds = [currentUser.id, location.state.targetUser.id].sort();
        chatId = `direct_${userIds[0]}_${userIds[1]}`;
        participants = [currentUser.id, location.state.targetUser.id];
        console.log('Created chatId from location.state:', chatId);
      }
      
      // If we have an activeChat, ALWAYS extract participants from chatId
      if (chatId && chatId.startsWith('direct_')) {
        const parts = chatId.replace('direct_', '').split('_');
        console.log('ChatId parts:', parts);
        if (parts.length >= 2) {
          // For chatId like "direct_dev_1761178419119_user_1761178453916"
          // We need to find the two user IDs
          const userIds = [];
          for (let i = 0; i < parts.length; i++) {
            if (parts[i].startsWith('dev_') || parts[i].startsWith('user_')) {
              userIds.push(parts[i]);
            }
          }
          if (userIds.length >= 2) {
            participants = [userIds[0], userIds[1]];
            console.log('Extracted participants from activeChat chatId:', participants);
          } else {
            // Fallback: use the first two parts
            participants = [parts[0], parts[1]];
            console.log('Fallback: using first two parts as participants:', participants);
          }
        }
      }
      
      // If we still don't have both participants, try to get the other user from selectedChat
      if (participants.length === 1 && selectedChat?.otherUserId) {
        participants = [currentUser.id, selectedChat.otherUserId];
        console.log('Added otherUserId to participants:', participants);
      }
      
      // Final fallback: ensure we have both participants for notifications
      if (participants.length === 1) {
        // If we only have one participant, try to get the other from the chat ID
        if (chatId && chatId.startsWith('direct_')) {
          const parts = chatId.replace('direct_', '').split('_');
          if (parts.length === 2) {
            const otherUserId = parts.find(id => id !== currentUser.id);
            if (otherUserId) {
              participants = [currentUser.id, otherUserId];
              console.log('Final fallback: added other user to participants:', participants);
            }
          }
        }
      }
      
      // Additional fallback: if we have directChatUser or selectedChat, use them
      if (participants.length === 1) {
        if (directChatUser && directChatUser.id !== currentUser.id) {
          participants = [currentUser.id, directChatUser.id];
          console.log('Using directChatUser for participants:', participants);
        } else if (selectedChat && selectedChat.otherUserId && selectedChat.otherUserId !== currentUser.id) {
          participants = [currentUser.id, selectedChat.otherUserId];
          console.log('Using selectedChat.otherUserId for participants:', participants);
        }
      }
      
      // Last resort: if still no participants, use current user only
      if (participants.length === 0) {
        participants = [currentUser.id];
      }
      
      console.log('Final chatId:', chatId);
      console.log('Final participants:', participants);
      console.log('Participants length:', participants.length);
      console.log('Current user ID:', currentUser.id);
      console.log('Direct chat user ID:', directChatUser?.id);
      console.log('Selected chat other user ID:', selectedChat?.otherUserId);
      
      if (message.trim() && chatId && !isSending) {
        setIsSending(true);
        try {
          console.log('Sending message:', message, 'to chat:', chatId);
          console.log('Participants being passed:', participants);
          console.log('Current user ID:', currentUser.id);
          const result = await sendMessage(chatId, currentUser.id, message, participants);
          if (result.success) {
            console.log('Message sent successfully');
            setMessage('');
            
            // Auto-scroll to bottom after sending message
            setTimeout(() => {
              scrollToBottom(true); // Smooth scroll after sending message
            }, 200);
          } else if (result.blocked) {
            console.log('Message blocked due to profanity:', result.error);
            showNotification(result.error || 'Message contains inappropriate language. Please use respectful language.');
          } else {
            console.error('Failed to send message:', result.error);
            showNotification('Failed to send message. Please try again.');
          }
        } catch (error) {
          console.error('Error sending message:', error);
        } finally {
          setIsSending(false);
        }
      } else {
        console.log('Message send conditions not met:', {
          messageTrimmed: message.trim(),
          chatId: chatId,
          isSending: isSending
        });
      }
    };

  // Debug logging (reduced for production)
  if (process.env.NODE_ENV === 'development') {
    console.log('ChatScreen render - directChatUser:', directChatUser);
    console.log('ChatScreen render - selectedChat:', selectedChat);
    console.log('ChatScreen render - isLoading:', isLoading);
    console.log('ChatScreen render - activeChat:', activeChat);
    console.log('ChatScreen render - should show chat interface:', !!(selectedChat || activeChat));
  }

  // Force show chat if we have a direct chat user (bypass all loading states)
  if (directChatUser) {
    console.log('ChatScreen: Showing direct chat interface');
    return (
      <div className="h-screen bg-valorant-dark flex flex-col animate-fade-in" style={{ height: '100vh', height: '100dvh' }}>
        {/* Chat View */}
        <>
          {/* Chat Header */}
          <div className="flex items-center justify-center p-4 pt-8 pb-4 border-b border-gray-700">
            <img 
              src="/images/header.png" 
              alt="Clutched" 
              className="h-8 w-auto"
            />
          </div>

          {/* Chat Controls */}
          <div className="flex items-center p-4 pb-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  console.log('Direct chat back button clicked - clearing directChatUser and activeChat');
                  setDirectChatUser(null);
                  setActiveChat(null);
                  navigate('/chat');
                }}
                className="text-valorant-red hover:text-red-400 transition-colors text-xl"
              >
                ←
              </button>
              <div className="relative">
                <img
                  src={directChatUser?.agentImage || '/images/default.jpg'}
                  alt={directChatUser?.favoriteAgent || 'Agent'}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    e.target.src = '/images/default.jpg';
                    e.target.className = 'w-10 h-10 rounded-full object-cover';
                  }}
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
              </div>
              <div>
                <h2 className="text-white font-semibold">{directChatUser?.username || directChatUser?.name || 'Unknown User'}</h2>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-center py-2">
            <span className="text-gray-400 text-sm">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Messages - Takes remaining space */}
          <div className="messages-container flex-1 px-4 py-6 space-y-4 overflow-y-auto min-h-0">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">💬</div>
                <p className="text-gray-400">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.senderId !== currentUser.id && (
                      <img
                        src={directChatUser?.agentImage || '/images/default.jpg'}
                        alt={directChatUser?.favoriteAgent || 'Agent'}
                        className="w-8 h-8 rounded-full object-cover mr-2 mt-1"
                        onError={(e) => {
                          e.target.src = '/images/default.jpg';
                          e.target.className = 'w-8 h-8 rounded-full object-cover mr-2 mt-1';
                        }}
                      />
                  )}
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl ${
                      msg.senderId === currentUser.id
                        ? 'bg-valorant-red text-white'
                        : 'bg-gray-700 text-white'
                    } relative`}
                    onContextMenu={(e) => handleLongPress(msg.id, e)}
                    onTouchStart={() => handleTouchStart(msg.id)}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={() => handleTouchStart(msg.id)}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                  >
                    <p className="text-sm">{msg.content}</p>
                    
                    {/* Reactions Display */}
                    {messageReactions[msg.id] && Object.keys(messageReactions[msg.id]).some(key => messageReactions[msg.id][key] > 0) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(messageReactions[msg.id]).map(([reaction, count]) => {
                          if (count > 0) {
                            const reactionOption = REACTION_OPTIONS.find(opt => opt.key === reaction);
                            return (
                              <span
                                key={reaction}
                                className={`text-xs px-2 py-1 rounded-full ${
                                  userReactions[msg.id] === reaction 
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
              ))
            )}
          </div>

          {/* Message Input - Fixed at Screen Bottom */}
          <div className="p-4 border-t border-gray-700 bg-valorant-dark">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-valorant-red focus:ring-2 focus:ring-valorant-red/20"
              />
              <button
                type="submit"
                disabled={isSending || !message.trim()}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl ${
                  isSending || !message.trim()
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-valorant-red hover:bg-red-600'
                }`}
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="text-white text-lg">➤</span>
                )}
              </button>
            </form>
          </div>
        </>
      </div>
    );
  }

  // Show loading state only if no chat is active and no direct chat user
  if (isLoading && !activeChat && !directChatUser) {
    console.log('ChatScreen: Showing loading state');
    return (
      <div className="h-screen bg-valorant-dark flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-valorant-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading chats...</p>
          <button
            onClick={() => navigate('/home')}
            className="mt-4 bg-valorant-red hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Force show chat if we have location state with targetUser (emergency fallback)
  if (location.state?.targetUser && !directChatUser) {
    console.log('ChatScreen: Emergency fallback - showing chat with location state');
    // Use consistent chat ID format
    const userIds = [currentUser.id, location.state.targetUser.id].sort();
    const chatId = `direct_${userIds[0]}_${userIds[1]}`;
    
    const emergencyChat = {
      id: chatId,
      name: location.state.targetUser.username || location.state.targetUser.name,
      favoriteAgent: location.state.targetUser.favoriteAgent,
      agentAvatar: location.state.targetUser.agentImage,
      lastMessage: "Start a conversation!",
      timestamp: new Date(),
      displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      unread: 0,
      online: true,
      otherUserId: location.state.targetUser.id
    };
    
    return (
      <div className="h-screen bg-valorant-dark flex flex-col animate-fade-in" style={{ height: '100vh', height: '100dvh' }}>
        {/* Chat View */}
        <>
          {/* Chat Header */}
          <div className="flex items-center justify-center p-4 pt-8 pb-4 border-b border-gray-700">
            <img 
              src="/images/header.png" 
              alt="Clutched" 
              className="h-8 w-auto"
            />
          </div>

          {/* Chat Controls */}
          <div className="flex items-center p-4 pb-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  console.log('Emergency chat back button clicked - clearing directChatUser and activeChat');
                  setDirectChatUser(null);
                  setActiveChat(null);
                  navigate('/chat');
                }}
                className="text-valorant-red hover:text-red-400 transition-colors text-xl"
              >
                ←
              </button>
              <div className="relative">
                <img
                  src={emergencyChat.agentAvatar}
                  alt={emergencyChat.favoriteAgent}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    e.target.src = '/images/default.jpg';
                    e.target.className = 'w-10 h-10 rounded-full object-cover';
                  }}
                />
                {emergencyChat.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                )}
              </div>
              <div>
                <h2 className="text-white font-semibold">{emergencyChat.name}</h2>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-center py-2">
            <span className="text-gray-400 text-sm">{emergencyChat.displayTime || emergencyChat.timestamp}</span>
          </div>

          {/* Messages - Takes remaining space */}
          <div className="messages-container flex-1 px-4 py-6 space-y-4 overflow-y-auto min-h-0">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">💬</div>
                <p className="text-gray-400">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.senderId !== currentUser.id && emergencyChat && (
                      <img
                        src={emergencyChat.agentAvatar}
                        alt={emergencyChat.favoriteAgent}
                        className="w-8 h-8 rounded-full object-cover mr-2 mt-1"
                        onError={(e) => {
                          e.target.src = '/images/default.jpg';
                          e.target.className = 'w-8 h-8 rounded-full object-cover mr-2 mt-1';
                        }}
                      />
                  )}
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl ${
                      msg.senderId === currentUser.id
                        ? 'bg-valorant-red text-white'
                        : 'bg-gray-700 text-white'
                    } relative`}
                    onContextMenu={(e) => handleLongPress(msg.id, e)}
                    onTouchStart={() => handleTouchStart(msg.id)}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={() => handleTouchStart(msg.id)}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                  >
                    <p className="text-sm">{msg.content}</p>
                    
                    {/* Reactions Display */}
                    {messageReactions[msg.id] && Object.keys(messageReactions[msg.id]).some(key => messageReactions[msg.id][key] > 0) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(messageReactions[msg.id]).map(([reaction, count]) => {
                          if (count > 0) {
                            const reactionOption = REACTION_OPTIONS.find(opt => opt.key === reaction);
                            return (
                              <span
                                key={reaction}
                                className={`text-xs px-2 py-1 rounded-full ${
                                  userReactions[msg.id] === reaction 
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
              ))
            )}
          </div>

          {/* Message Input - Fixed at Screen Bottom */}
          <div className="p-4 border-t border-gray-700 bg-valorant-dark">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-valorant-red focus:ring-2 focus:ring-valorant-red/20"
              />
              <button
                type="submit"
                disabled={isSending || !message.trim()}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl ${
                  isSending || !message.trim()
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-valorant-red hover:bg-red-600'
                }`}
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="text-white text-lg">➤</span>
                )}
              </button>
            </form>
          </div>
        </>
      </div>
    );
  }

  return (
    <div className="h-screen bg-valorant-dark flex flex-col animate-fade-in" style={{ height: '100vh', height: '100dvh' }}>
      {!activeChat ? (
        // Chat List
        <>
          {/* Header */}
          <div className="flex items-center justify-between p-4 pt-8 pb-4">
            <button
              onClick={() => {
                console.log('Chat list back button clicked - navigating to home');
                navigate('/home');
              }}
              className="text-valorant-red hover:text-red-400 transition-colors text-xl"
            >
              ←
            </button>
            <div className="flex-1 flex justify-center">
              <img 
                src="/images/header.png" 
                alt="Clutched" 
                className="h-8 w-auto"
              />
            </div>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="text-valorant-red hover:text-red-400 transition-colors text-xl w-8 flex justify-center"
            >
              ☰
            </button>
          </div>

          {/* Hamburger Menu */}
          {showMenu && (
            <div className="absolute top-20 right-4 z-50 bg-valorant-dark border border-valorant-red rounded-lg shadow-2xl min-w-48">
              <div className="p-4">
                <button
                  onClick={() => {
                    navigate('/home');
                    setShowMenu(false);
                  }}
                  className="w-full text-left text-white hover:text-valorant-red transition-colors py-2 flex items-center"
                >
                  🏠 Home
                </button>
                <button
                  onClick={() => {
                    navigate('/chat');
                    setShowMenu(false);
                  }}
                  className="w-full text-left text-white hover:text-valorant-red transition-colors py-2 flex items-center"
                >
                  💬 Chat
                </button>
                <button
                  onClick={() => {
                    navigate('/global-chat');
                    setShowMenu(false);
                  }}
                  className="w-full text-left text-white hover:text-valorant-red transition-colors py-2 flex items-center"
                >
                  🌍 Global Chat
                </button>
                <button
                  onClick={() => {
                    navigate('/profile');
                    setShowMenu(false);
                  }}
                  className="w-full text-left text-white hover:text-valorant-red transition-colors py-2 flex items-center"
                >
                  👤 Profile
                </button>
              </div>
            </div>
          )}

          {/* Chat List */}
          <div className="px-4 py-6">
            {chats.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl font-bold text-white mb-2">No chats yet</h2>
                <p className="text-gray-400">Start swiping and chatting with players!</p>
                <div className="mt-4">
                  <button
                    onClick={() => navigate('/home')}
                    className="bg-valorant-red hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Start Swiping
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setActiveChat(chat.id)}
                    className="bg-gray-900 rounded-2xl p-4 cursor-pointer hover:bg-gray-800 transition-all duration-300"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <img
                          src={chat.agentAvatar}
                          alt={chat.favoriteAgent}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            e.target.src = '/images/default.jpg';
                            e.target.className = 'w-12 h-12 rounded-full object-cover';
                          }}
                        />
                        {chat.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                        )}
                      </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-white font-semibold truncate">{chat.name}</h3>
                            <span className="text-gray-400 text-xs">{chat.displayTime || chat.timestamp}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-gray-400 text-sm truncate">{chat.lastMessage}</p>
                            {chat.unread > 0 && (
                              <span className="bg-valorant-red text-white text-xs px-2 py-1 rounded-full">
                                {chat.unread}
                              </span>
                            )}
                          </div>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (selectedChat || activeChat) ? (
        // Chat View
        <>
          {/* Chat Header */}
          <div className="flex items-center justify-center p-4 pt-8 pb-4 border-b border-gray-700">
            <img 
              src="/images/header.png" 
              alt="Clutched" 
              className="h-8 w-auto"
            />
          </div>

          {/* Chat Controls */}
          <div className="flex items-center p-4 pb-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  console.log('Chat back button clicked - clearing activeChat');
                  setActiveChat(null);
                  setSelectedChat(null);
                  navigate('/chat');
                }}
                className="text-valorant-red hover:text-red-400 transition-colors text-xl"
              >
                ←
              </button>
              <div className="relative">
                <img
                  src={selectedChat?.agentAvatar || directChatUser?.agentImage || chatUserInfo?.agentImage || '/images/default.jpg'}
                  alt={selectedChat?.favoriteAgent || directChatUser?.favoriteAgent || chatUserInfo?.favoriteAgent || 'Agent'}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    e.target.src = '/images/default.jpg';
                    e.target.className = 'w-10 h-10 rounded-full object-cover';
                  }}
                />
                {(selectedChat?.online || directChatUser) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                )}
              </div>
              <div>
                <h2 className="text-white font-semibold">{selectedChat?.name || directChatUser?.name || directChatUser?.username || chatUserInfo?.name || 'Unknown User'}</h2>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-center py-2">
            <span className="text-gray-400 text-sm">{selectedChat?.displayTime || selectedChat?.timestamp || 'Now'}</span>
          </div>

          {/* Messages - Takes remaining space */}
          <div className="messages-container flex-1 px-4 py-6 space-y-4 overflow-y-auto min-h-0">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">💬</div>
                <p className="text-gray-400">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.senderId !== currentUser.id && (selectedChat || directChatUser) && (
                    <img
                      src={selectedChat?.agentAvatar || directChatUser?.agentImage || chatUserInfo?.agentImage || '/images/default.jpg'}
                      alt={selectedChat?.favoriteAgent || directChatUser?.favoriteAgent || chatUserInfo?.favoriteAgent || 'Agent'}
                      className="w-8 h-8 rounded-full object-cover mr-2 mt-1"
                      onError={(e) => {
                        e.target.src = '/images/default.jpg';
                        e.target.className = 'w-8 h-8 rounded-full object-cover mr-2 mt-1';
                      }}
                    />
                  )}
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl ${
                      msg.senderId === currentUser.id
                        ? 'bg-valorant-red text-white'
                        : 'bg-gray-700 text-white'
                    } relative`}
                    onContextMenu={(e) => handleLongPress(msg.id, e)}
                    onTouchStart={() => handleTouchStart(msg.id)}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={() => handleTouchStart(msg.id)}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                  >
                    <p className="text-sm">{msg.content}</p>
                    
                    {/* Reactions Display */}
                    {messageReactions[msg.id] && Object.keys(messageReactions[msg.id]).some(key => messageReactions[msg.id][key] > 0) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(messageReactions[msg.id]).map(([reaction, count]) => {
                          if (count > 0) {
                            const reactionOption = REACTION_OPTIONS.find(opt => opt.key === reaction);
                            return (
                              <span
                                key={reaction}
                                className={`text-xs px-2 py-1 rounded-full ${
                                  userReactions[msg.id] === reaction 
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
              ))
            )}
          </div>

          {/* Message Input - Fixed at Screen Bottom */}
          <div className="p-4 border-t border-gray-700 bg-valorant-dark">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-valorant-red focus:ring-2 focus:ring-valorant-red/20"
              />
              <button
                type="submit"
                disabled={isSending || !message.trim()}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl ${
                  isSending || !message.trim()
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-valorant-red hover:bg-red-600'
                }`}
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="text-white text-lg">➤</span>
                )}
              </button>
            </form>
          </div>
        </>
      ) : (
        // Loading or error state
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-valorant-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading chat...</p>
            <button
              onClick={() => {
                console.log('Back to chat list button clicked - clearing directChatUser and activeChat');
                setDirectChatUser(null);
                setActiveChat(null);
                navigate('/chat');
              }}
              className="mt-4 bg-valorant-red hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Back to Chat List
            </button>
          </div>
        </div>
      )}

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

export default ChatScreen;
