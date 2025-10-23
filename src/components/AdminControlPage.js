import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsersWithActiveStatus, updateUserProfile, setUserOffline } from '../firebase/services/userService';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { isModeratorAccount, getUserRoleBadge, getUserAvatar } from '../utils/avatarUtils';
import { uploadImage, getImagePreview, revokeImagePreview } from '../firebase/services/imageUploadService';
import '../utils/testUpload'; // Import test utility

const AdminControlPage = ({ currentUser }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive, banned
  const [filterRole, setFilterRole] = useState('all'); // all, developer, moderator, tester, user
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [showBannedUsers, setShowBannedUsers] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Available avatars for profile picture changes
  const availableAvatars = [
    '/images/admin.jpg',
    '/images/jett.jpg',
    '/images/sage.jpg',
    '/images/omen.jpg',
    '/images/reyna.jpg',
    '/images/clove.jpg',
    '/images/default.jpg'
  ];

  // Check if current user is admin/developer
  const isAdmin = currentUser?.isDeveloper || currentUser?.username === 'Alexus Karl' || currentUser?.id === 'dev_1761178419119';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/home');
      return;
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;

    const loadUsers = () => {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const allUsers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          isCurrentlyActive: doc.data().isActive && 
            doc.data().lastSeen && 
            (new Date().getTime() - doc.data().lastSeen.toDate().getTime()) < 5 * 60 * 1000
        }));
        
        setUsers(allUsers);
        setLoading(false);
      }, (error) => {
        console.error('Error loading users:', error);
        setLoading(false);
      });

      return unsubscribe;
    };

    const unsubscribe = loadUsers();
    return () => unsubscribe();
  }, [isAdmin]);

  // Filter users based on search, status, and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = (() => {
      switch (filterStatus) {
        case 'active':
          return user.isCurrentlyActive;
        case 'inactive':
          return !user.isCurrentlyActive && user.isActive;
        case 'banned':
          return user.isBanned;
        case 'all':
        default:
          return true;
      }
    })();

    const matchesRole = (() => {
      switch (filterRole) {
        case 'developer':
          return user.isDeveloper || user.role === 'developer';
        case 'moderator':
          return user.role === 'moderator';
        case 'tester':
          return user.role === 'tester';
        case 'user':
          return !user.isDeveloper && !user.role;
        case 'all':
        default:
          return true;
      }
    })();

    const matchesBannedFilter = showBannedUsers ? true : !user.isBanned;

    return matchesSearch && matchesStatus && matchesRole && matchesBannedFilter;
  });

  const handleUserAction = async (userId, action, value = null) => {
    setActionLoading(true);
    try {
      const userRef = doc(db, 'users', userId);
      
      switch (action) {
        case 'ban':
          await updateDoc(userRef, { 
            isBanned: true, 
            bannedAt: new Date(),
            bannedBy: currentUser.username 
          });
          break;
        case 'unban':
          await updateDoc(userRef, { 
            isBanned: false,
            bannedAt: null,
            bannedBy: null 
          });
          break;
        case 'delete':
          await deleteDoc(userRef);
          break;
        case 'setOffline':
          await setUserOffline(userId);
          break;
        case 'toggleActive':
          const user = users.find(u => u.id === userId);
          await updateDoc(userRef, { isActive: !user.isActive });
          break;
        case 'changeRole':
          await updateDoc(userRef, { 
            role: value,
            roleChangedAt: new Date(),
            roleChangedBy: currentUser.username
          });
          break;
        case 'changeAvatar':
          // Check if it's a base64 image (custom upload)
          if (value && value.startsWith('data:image/')) {
            // Store in customImages for base64 images
            const timestamp = Date.now();
            const fileExtension = 'jpg'; // Default extension for base64
            const fileName = `avatar_${timestamp}.${fileExtension}`;
            
            await updateDoc(userRef, { 
              avatar: value, // Also set as main avatar
              [`customImages.${fileName}`]: value,
              [`customImages.avatar_current`]: value,
              [`customImages.avatar_updated`]: new Date(),
              avatarChangedAt: new Date(),
              avatarChangedBy: currentUser.username
            });
          } else {
            // Regular avatar (predefined or Firebase Storage)
            await updateDoc(userRef, { 
              avatar: value,
              avatarChangedAt: new Date(),
              avatarChangedBy: currentUser.username
            });
          }
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action} on user:`, error);
      alert(`Error performing ${action}: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      alert('Please select users first');
      return;
    }

    setActionLoading(true);
    try {
      for (const userId of selectedUsers) {
        await handleUserAction(userId, action);
      }
      setSelectedUsers([]);
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      alert(`Error performing bulk ${action}: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(filteredUsers.map(user => user.id));
  };

  const clearSelection = () => {
    setSelectedUsers([]);
  };

  const getRoleBadge = (user) => {
    const badgeInfo = getUserRoleBadge(user);
    if (!badgeInfo) return null;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold tracking-wider uppercase border ${badgeInfo.bgColor} ${badgeInfo.color} ${badgeInfo.borderColor}`}>
        {badgeInfo.text}
      </span>
    );
  };

  const openRoleModal = (user) => {
    setEditingUser(user);
    setShowRoleModal(true);
  };

  const openAvatarModal = (user) => {
    setEditingUser(user);
    setShowAvatarModal(true);
    // Clear any previous upload state
    setSelectedFile(null);
    setImagePreview(null);
  };

  // Image upload functions
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const preview = getImagePreview(file);
      setImagePreview(preview);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedFile || !editingUser) {
      return;
    }

    setIsUploading(true);
    try {
      console.log('Starting image upload for user:', editingUser.username);
      console.log('File details:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      });
      
      const result = await uploadImage(selectedFile, editingUser.id, 'avatar');
      
      if (result.success) {
        console.log('Upload successful, updating user profile...');
        console.log('Result URL type:', result.url?.substring(0, 20) + '...');
        
        // Update user profile with new avatar URL
        await handleUserAction(editingUser.id, 'changeAvatar', result.url);
        
        // Clear upload state
        setSelectedFile(null);
        setImagePreview(null);
        setShowAvatarModal(false);
        
        console.log('Image uploaded successfully:', result.url);
        alert('Image uploaded successfully!');
      } else {
        console.error('Upload failed:', result.error);
        alert(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    if (imagePreview) {
      revokeImagePreview(imagePreview);
    }
    setSelectedFile(null);
    setImagePreview(null);
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-valorant-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-valorant-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-valorant-dark p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Admin Control Panel</h1>
            <p className="text-gray-400 text-sm sm:text-base">Manage users and system settings</p>
          </div>
          <button
            onClick={() => navigate('/home')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm sm:text-base"
          >
            Back to App
          </button>
        </div>

        {/* Stats Cards - Mobile Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="valorant-card p-3 sm:p-6">
            <h3 className="text-lg sm:text-2xl font-bold text-white">{users.length}</h3>
            <p className="text-gray-400 text-xs sm:text-base">Total Users</p>
          </div>
          <div className="valorant-card p-3 sm:p-6">
            <h3 className="text-lg sm:text-2xl font-bold text-green-400">
              {users.filter(u => u.isCurrentlyActive).length}
            </h3>
            <p className="text-gray-400 text-xs sm:text-base">Active Now</p>
          </div>
          <div className="valorant-card p-3 sm:p-6">
            <h3 className="text-lg sm:text-2xl font-bold text-red-400">
              {users.filter(u => u.isBanned).length}
            </h3>
            <p className="text-gray-400 text-xs sm:text-base">Banned Users</p>
          </div>
          <div className="valorant-card p-3 sm:p-6">
            <h3 className="text-lg sm:text-2xl font-bold text-blue-400">
              {users.filter(u => u.isDeveloper || u.role === 'developer').length}
            </h3>
            <p className="text-gray-400 text-xs sm:text-base">Developers</p>
          </div>
        </div>

        {/* Filters and Search - Mobile Responsive */}
        <div className="valorant-card p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="w-full">
              <input
                type="text"
                placeholder="Search users by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 text-white px-3 sm:px-4 py-2 rounded-lg border border-gray-600 focus:border-valorant-red focus:outline-none text-sm sm:text-base"
              />
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 bg-gray-800 text-white px-3 sm:px-4 py-2 rounded-lg border border-gray-600 focus:border-valorant-red focus:outline-none text-sm sm:text-base"
              >
                <option value="all">All Users</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="banned">Banned</option>
              </select>
              
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="flex-1 bg-gray-800 text-white px-3 sm:px-4 py-2 rounded-lg border border-gray-600 focus:border-valorant-red focus:outline-none text-sm sm:text-base"
              >
                <option value="all">All Roles</option>
                <option value="developer">Developers</option>
                <option value="moderator">Moderators</option>
                <option value="tester">Testers</option>
                <option value="user">Regular Users</option>
              </select>
            </div>
            
            {/* Checkbox */}
            <label className="flex items-center text-white text-sm sm:text-base">
              <input
                type="checkbox"
                checked={showBannedUsers}
                onChange={(e) => setShowBannedUsers(e.target.checked)}
                className="mr-2"
              />
              Show Banned Users
            </label>
          </div>
        </div>

        {/* Bulk Actions - Mobile Responsive */}
        {selectedUsers.length > 0 && (
          <div className="valorant-card p-3 sm:p-4 mb-4 sm:mb-6 bg-yellow-900/20 border border-yellow-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-yellow-400 font-semibold text-sm sm:text-base">
                {selectedUsers.length} user(s) selected
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleBulkAction('ban')}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors disabled:opacity-50"
                >
                  Ban Selected
                </button>
                <button
                  onClick={() => handleBulkAction('unban')}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors disabled:opacity-50"
                >
                  Unban Selected
                </button>
                <button
                  onClick={() => handleBulkAction('setOffline')}
                  disabled={actionLoading}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors disabled:opacity-50"
                >
                  Set Offline
                </button>
                <button
                  onClick={clearSelection}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Table - Mobile Responsive */}
        <div className="valorant-card overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-white">Users ({filteredUsers.length})</h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAllUsers}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block sm:hidden">
            {filteredUsers.map((user) => (
              <div key={user.id} className="border-b border-gray-700 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="rounded mr-3"
                    />
                    <img
                      src={getUserAvatar(user)}
                      alt={user.username}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="ml-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm">{user.username}</span>
                        {getRoleBadge(user)}
                      </div>
                      <div className="text-gray-400 text-xs">{user.email}</div>
                      <div className="text-gray-500 text-xs">ID: {user.id}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.isCurrentlyActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.isCurrentlyActive ? 'Online' : 'Offline'}
                  </span>
                  {user.isBanned && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Banned
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-gray-400 mb-3">
                  <div>Last seen: {user.lastSeen ? 
                    new Date(user.lastSeen.toDate ? user.lastSeen.toDate() : user.lastSeen).toLocaleString() :
                    'Never'
                  }</div>
                  <div>Created: {user.createdAt ? 
                    new Date(user.createdAt.toDate ? user.createdAt.toDate() : user.createdAt).toLocaleDateString() :
                    'Unknown'
                  }</div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {user.isBanned ? (
                    <button
                      onClick={() => handleUserAction(user.id, 'unban')}
                      disabled={actionLoading}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                    >
                      Unban
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUserAction(user.id, 'ban')}
                      disabled={actionLoading || user.isDeveloper}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                    >
                      Ban
                    </button>
                  )}
                  <button
                    onClick={() => handleUserAction(user.id, 'setOffline')}
                    disabled={actionLoading}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                  >
                    Offline
                  </button>
                  <button
                    onClick={() => openRoleModal(user)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
                  >
                    Role
                  </button>
                        <button
                          onClick={() => openAvatarModal(user)}
                          disabled={!isAdmin}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-xs transition-colors"
                          title={!isAdmin ? "Only admins can change avatars" : "Change user avatar"}
                        >
                          Avatar
                        </button>
                  {!user.isDeveloper && (
                    <button
                      onClick={() => handleUserAction(user.id, 'delete')}
                      disabled={actionLoading}
                      className="bg-red-800 hover:bg-red-900 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Last Seen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={getUserAvatar(user)}
                          alt={user.username}
                          className="w-10 h-10 rounded-full mr-3"
                        />
                        <div>
                          <div className="text-sm font-medium text-white flex items-center gap-2">
                            {user.username}
                            {getRoleBadge(user)}
                          </div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                          <div className="text-xs text-gray-500">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isCurrentlyActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.isCurrentlyActive ? 'Online' : 'Offline'}
                        </span>
                        {user.isBanned && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Banned
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {user.lastSeen ? 
                        new Date(user.lastSeen.toDate ? user.lastSeen.toDate() : user.lastSeen).toLocaleString() :
                        'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {user.createdAt ? 
                        new Date(user.createdAt.toDate ? user.createdAt.toDate() : user.createdAt).toLocaleDateString() :
                        'Unknown'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        {user.isBanned ? (
                          <button
                            onClick={() => handleUserAction(user.id, 'unban')}
                            disabled={actionLoading}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction(user.id, 'ban')}
                            disabled={actionLoading || user.isDeveloper}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                          >
                            Ban
                          </button>
                        )}
                        <button
                          onClick={() => handleUserAction(user.id, 'setOffline')}
                          disabled={actionLoading}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                        >
                          Offline
                        </button>
                        <button
                          onClick={() => openRoleModal(user)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
                        >
                          Role
                        </button>
                        <button
                          onClick={() => openAvatarModal(user)}
                          disabled={!isAdmin}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-xs transition-colors"
                          title={!isAdmin ? "Only admins can change avatars" : "Change user avatar"}
                        >
                          Avatar
                        </button>
                        {!user.isDeveloper && (
                          <button
                            onClick={() => handleUserAction(user.id, 'delete')}
                            disabled={actionLoading}
                            className="bg-red-800 hover:bg-red-900 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No users found matching your criteria</p>
            </div>
          )}
        </div>

        {/* Role Change Modal */}
        {showRoleModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-valorant-dark border border-valorant-red rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Change Role for {editingUser.username}</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    handleUserAction(editingUser.id, 'changeRole', 'developer');
                    setShowRoleModal(false);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Developer
                </button>
                <button
                  onClick={() => {
                    handleUserAction(editingUser.id, 'changeRole', 'moderator');
                    setShowRoleModal(false);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Moderator
                </button>
                <button
                  onClick={() => {
                    handleUserAction(editingUser.id, 'changeRole', 'tester');
                    setShowRoleModal(false);
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Tester
                </button>
                <button
                  onClick={() => {
                    handleUserAction(editingUser.id, 'changeRole', null);
                    setShowRoleModal(false);
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Regular User
                </button>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="w-full mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Avatar Change Modal */}
        {showAvatarModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-valorant-dark border border-valorant-red rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-4">Change Avatar for {editingUser.username}</h3>
              
              {/* Upload Section */}
              <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                <h4 className="text-white font-semibold mb-3">Upload Custom Image</h4>
                {!imagePreview ? (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="admin-image-upload"
                    />
                    <label
                      htmlFor="admin-image-upload"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors text-sm"
                    >
                      📷 Upload Custom Image
                    </label>
                    <p className="text-gray-400 text-xs mt-1">Max 5MB, JPG/PNG/GIF</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-20 h-20 rounded-full mx-auto mb-2 object-cover"
                      />
                      <p className="text-green-400 text-sm">Image selected. Ready to upload?</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleImageUpload}
                        disabled={isUploading}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        {isUploading ? 'Uploading...' : 'Upload Image'}
                      </button>
                      <button
                        onClick={handleCancelUpload}
                        disabled={isUploading}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Predefined Avatars Section */}
              <div className="mb-4">
                <h4 className="text-white font-semibold mb-3">Choose Predefined Avatar</h4>
                <div className="grid grid-cols-2 gap-3">
                  {availableAvatars.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => {
                        handleUserAction(editingUser.id, 'changeAvatar', avatar);
                        setShowAvatarModal(false);
                      }}
                      className="flex flex-col items-center p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <img
                        src={avatar}
                        alt="Avatar"
                        className="w-12 h-12 rounded-full mb-2"
                      />
                      <span className="text-white text-xs">
                        {avatar.split('/').pop().split('.')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setShowAvatarModal(false);
                  handleCancelUpload();
                }}
                className="w-full mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminControlPage;