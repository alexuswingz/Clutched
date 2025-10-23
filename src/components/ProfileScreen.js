import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startMessageSync, stopMessageSync } from '../firebase/services/messageSyncManager';
import { deleteUserAccount } from '../firebase/services/resetService';
import { setUserOnline, setUserOffline } from '../firebase/services/userService';
import { useToast } from '../contexts/ToastContext';
import { getUserAvatar, isDeveloperAccount, getUserRoleBadge, processUserAvatar } from '../utils/avatarUtils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const ProfileScreen = ({ currentUser, onLogout, onProfileUpdate }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [freshUserData, setFreshUserData] = useState(null);
  const { showNotification } = useToast();
  
  // Fetch fresh user data to get updated custom images
  const fetchFreshUserData = async () => {
    if (!currentUser?.id) return;
    
    try {
      const userRef = doc(db, 'users', currentUser.id);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFreshUserData(userData);
        console.log('Fresh user data loaded:', userData);
      }
    } catch (error) {
      console.error('Error fetching fresh user data:', error);
    }
  };
  
  // Fetch fresh data on component mount and when component becomes visible
  useEffect(() => {
    fetchFreshUserData();
  }, [currentUser?.id]);
  
  // Refresh data when component becomes visible (user navigates back to profile)
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
  
  // Vibration function for ProfileScreen
  const vibrate = () => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]); // Short vibration pattern
    }
  };
  const [profileData, setProfileData] = useState({
    bio: currentUser?.bio || "Looking for my duo partner in crime! 🔥",
    location: currentUser?.location || "Los Angeles, CA",
    favoriteAgent: currentUser?.favoriteAgent || "Jett"
  });
  
  // Update profile data when fresh user data is loaded
  useEffect(() => {
    if (freshUserData) {
      setProfileData({
        bio: freshUserData.bio || "Looking for my duo partner in crime! 🔥",
        location: freshUserData.location || "Los Angeles, CA",
        favoriteAgent: freshUserData.favoriteAgent || "Jett"
      });
    }
  }, [freshUserData]);
  

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

  // Set up global message sync for notifications
  useEffect(() => {
    if (!currentUser?.id) return;

    console.log('=== PROFILESCREEN: SETTING UP GLOBAL MESSAGE SYNC ===');
    console.log('Setting up global sync for user:', currentUser.id);

    const handleNewMessage = (messageData) => {
      console.log('=== PROFILESCREEN: NEW MESSAGE DETECTED ===');
      console.log('New message data:', messageData);
      
      // Just vibrate in ProfileScreen - no notification
      console.log('ProfileScreen: Vibrating for new message');
      vibrate();
    };

    const handleChatUpdate = (chatId, latestMessage) => {
      console.log('=== PROFILESCREEN: CHAT UPDATE DETECTED ===');
      console.log('Chat ID:', chatId);
      console.log('Latest message:', latestMessage);
    };

    // Use centralized message sync manager
    startMessageSync(currentUser.id, handleNewMessage, handleChatUpdate);

    return () => {
      console.log('PROFILESCREEN: Cleaning up message sync');
      stopMessageSync();
    };
  }, [currentUser?.id, showNotification]);

  const handleInputChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = () => {
    setIsEditing(false);
    // Update currentUser with new profile data
    const updatedUser = {
      ...currentUser,
      ...profileData
    };
    
    // Save to localStorage
    localStorage.setItem('clutched_user', JSON.stringify(updatedUser));
    
    // Update parent component
    if (onProfileUpdate) {
      onProfileUpdate(updatedUser);
    }
    
    console.log('Profile updated:', profileData);
  };


  const handleDeleteAccount = async () => {
    if (!currentUser?.id) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteUserAccount(currentUser.id);
      
      if (result.success) {
        showNotification('Account deleted successfully');
        
        // Logout and redirect to welcome screen
        setTimeout(() => {
          onLogout();
          navigate('/', { replace: true });
        }, 2000);
      } else {
        showNotification('Failed to delete account. Please try again.');
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      showNotification('Failed to delete account. Please try again.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-valorant-dark animate-fade-in" style={{ minHeight: '100vh', minHeight: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-8 pb-4">
        <button
          onClick={() => navigate('/home')}
          className="text-white hover:text-valorant-red transition-colors"
        >
          ← Back
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
          className="text-white hover:text-valorant-red transition-colors text-xl w-8 flex justify-center"
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
                navigate('/profile');
                setShowMenu(false);
              }}
              className="w-full text-left text-white hover:text-valorant-red transition-colors py-2 flex items-center"
            >
              👤 Profile
            </button>
            <button
              onClick={() => {
                setShowDeleteConfirm(true);
                setShowMenu(false);
              }}
              className="w-full text-left text-red-600 hover:text-red-500 transition-colors py-2 flex items-center"
            >
              🗑️ Delete Account
            </button>
          </div>
        </div>
      )}

      {/* Profile Content */}
      <div className="px-4 py-6">
        {/* Profile Image */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <img
              src={getUserAvatar(processedUser)}
              alt="Profile"
              className="w-32 h-32 rounded-full border-4 border-valorant-red object-cover"
              onError={(e) => {
                e.target.src = '/images/default.jpg';
                e.target.className = 'w-32 h-32 rounded-full border-4 border-valorant-red object-cover';
              }}
            />
            {/* Role Badge */}
            {getUserRoleBadge(processedUser) && (
              <div className={`absolute -bottom-2 -right-2 ${getUserRoleBadge(processedUser).bgColor} ${getUserRoleBadge(processedUser).color} text-xs font-bold px-2 py-1 rounded-lg border ${getUserRoleBadge(processedUser).borderColor}`}>
                {getUserRoleBadge(processedUser).text}
              </div>
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-white mt-4">{userData?.username}</h2>
          <div className="flex items-center justify-center space-x-2 mt-2">
            <span className="bg-valorant-red text-white px-3 py-1 rounded-full text-sm font-semibold">
              {userData?.rank || "Radiant"}
            </span>
          </div>
          
        </div>

        {/* Profile Details */}
        <div className="valorant-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">About Me</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-valorant-red hover:text-pink-400 transition-colors text-sm"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bio
              </label>
              {isEditing ? (
                <textarea
                  name="bio"
                  value={profileData.bio}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-valorant-red focus:border-transparent"
                  rows="3"
                />
              ) : (
                <p className="text-gray-300">{profileData.bio}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Location
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="location"
                  value={profileData.location}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-valorant-red focus:border-transparent"
                />
              ) : (
                <p className="text-gray-300">{profileData.location}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Favorite Agent
              </label>
              {isEditing ? (
                <select
                  name="favoriteAgent"
                  value={profileData.favoriteAgent}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-valorant-red focus:border-transparent"
                >
                  <option value="Jett">Jett</option>
                  <option value="Sage">Sage</option>
                  <option value="Phoenix">Phoenix</option>
                  <option value="Raze">Raze</option>
                  <option value="Omen">Omen</option>
                  <option value="Viper">Viper</option>
                  <option value="Cypher">Cypher</option>
                  <option value="Sova">Sova</option>
                  <option value="Brimstone">Brimstone</option>
                  <option value="Breach">Breach</option>
                </select>
              ) : (
                <p className="text-gray-300">{profileData.favoriteAgent}</p>
              )}
            </div>

            {isEditing && (
              <button
                onClick={handleSave}
                className="w-full valorant-button text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
              >
                Save Changes
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Delete Account Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-valorant-dark to-gray-900 rounded-xl p-6 max-w-md mx-4 border border-valorant-red/30">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Delete Account</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete your account? This action cannot be undone and will permanently remove:
              </p>
              
              <ul className="text-left text-sm text-gray-400 mb-6 space-y-1">
                <li>• Your profile and all personal data</li>
                <li>• All your matches and conversations</li>
                <li>• All messages you've sent or received</li>
              </ul>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Account'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileScreen;
